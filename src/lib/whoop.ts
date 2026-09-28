import { prisma } from "./db";
import { NOT_CONFIGURED_MESSAGE, authSecret } from "./auth";

// Whoop OAuth2 + API v2. Register a dev app at https://developer.whoop.com and
// set WHOOP_CLIENT_ID / WHOOP_CLIENT_SECRET / WHOOP_REDIRECT_URI in .env.

const AUTH_URL = "https://api.prod.whoop.com/oauth/oauth2/auth";
const TOKEN_URL = "https://api.prod.whoop.com/oauth/oauth2/token";
const API_BASE = "https://api.prod.whoop.com/developer/v2";

export const WHOOP_SCOPES = [
  "read:recovery",
  "read:sleep",
  "read:cycles",
  "read:profile",
  "offline", // required to receive a refresh token
];

export function isWhoopConfigured(): boolean {
  return Boolean(process.env.WHOOP_CLIENT_ID && process.env.WHOOP_CLIENT_SECRET);
}

function cfg() {
  const clientId = process.env.WHOOP_CLIENT_ID || "";
  const clientSecret = process.env.WHOOP_CLIENT_SECRET || "";
  const redirectUri = process.env.WHOOP_REDIRECT_URI || "http://localhost:3000/api/whoop/callback";
  return { clientId, clientSecret, redirectUri };
}

// --- Signed state (memberId + nonce), to survive the OAuth round-trip safely ---

const STATE_TTL_MS = 10 * 60_000;

async function hmac(message: string): Promise<string> {
  const secret = authSecret();
  if (!secret) throw new Error(NOT_CONFIGURED_MESSAGE);
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(message));
  return Buffer.from(new Uint8Array(sig)).toString("base64url");
}

export async function signState(memberId: string): Promise<string> {
  const payload = `${memberId}.${Date.now()}`;
  const sig = await hmac(payload);
  return Buffer.from(`${payload}.${sig}`).toString("base64url");
}

export async function verifyState(state: string): Promise<string | null> {
  try {
    const decoded = Buffer.from(state, "base64url").toString("utf-8");
    const [memberId, ts, sig] = decoded.split(".");
    if (!memberId || !ts || !sig) return null;
    const expected = await hmac(`${memberId}.${ts}`);
    if (expected !== sig) return null;
    // A state is only good for the round-trip it was issued for, not replayable later.
    const age = Date.now() - Number(ts);
    if (!Number.isFinite(age) || age < 0 || age > STATE_TTL_MS) return null;
    return memberId;
  } catch {
    return null;
  }
}

export function getAuthUrl(state: string): string {
  const { clientId, redirectUri } = cfg();
  const params = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: WHOOP_SCOPES.join(" "),
    state,
  });
  return `${AUTH_URL}?${params.toString()}`;
}

interface TokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  scope?: string;
}

export async function exchangeCode(code: string): Promise<TokenResponse> {
  const { clientId, clientSecret, redirectUri } = cfg();
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirectUri,
  });
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) throw new Error(`Whoop token exchange failed: ${res.status} ${await res.text()}`);
  return res.json();
}

async function refreshTokens(refreshToken: string): Promise<TokenResponse> {
  const { clientId, clientSecret } = cfg();
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
    client_id: clientId,
    client_secret: clientSecret,
    scope: "offline",
  });
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) throw new Error(`Whoop token refresh failed: ${res.status} ${await res.text()}`);
  return res.json();
}

async function getValidAccessToken(memberId: string): Promise<string> {
  const conn = await prisma.whoopConnection.findUnique({ where: { memberId } });
  if (!conn) throw new Error("Whoop не подключён для этого члена семьи");
  // Refresh if expiring within 2 minutes.
  if (conn.expiresAt.getTime() - Date.now() < 120_000) {
    const tok = await refreshTokens(conn.refreshToken);
    await prisma.whoopConnection.update({
      where: { memberId },
      data: {
        accessToken: tok.access_token,
        refreshToken: tok.refresh_token || conn.refreshToken,
        expiresAt: new Date(Date.now() + tok.expires_in * 1000),
        scopes: tok.scope || conn.scopes,
      },
    });
    return tok.access_token;
  }
  return conn.accessToken;
}

export async function fetchProfile(accessToken: string): Promise<{ user_id?: number }> {
  const res = await fetch(`${API_BASE}/user/profile/basic`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) return {};
  return res.json();
}

interface Collection<T> {
  records: T[];
  next_token?: string | null;
}

async function fetchCollection<T>(path: string, accessToken: string, limit = 25): Promise<T[]> {
  const out: T[] = [];
  let nextToken: string | null | undefined = undefined;
  for (let page = 0; page < 8; page++) {
    const url = new URL(`${API_BASE}${path}`);
    url.searchParams.set("limit", String(limit));
    if (nextToken) url.searchParams.set("nextToken", nextToken);
    const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
    if (!res.ok) throw new Error(`Whoop ${path} → ${res.status} ${await res.text()}`);
    const data = (await res.json()) as Collection<T>;
    out.push(...(data.records || []));
    nextToken = data.next_token;
    if (!nextToken) break;
  }
  return out;
}

function dayKey(iso: string): string {
  return new Date(iso).toISOString().slice(0, 10);
}

// Whoop response shapes (subset we use).
interface Recovery {
  created_at: string;
  score?: { recovery_score?: number; hrv_rmssd_milli?: number; resting_heart_rate?: number };
}
interface Sleep {
  start: string;
  score?: {
    sleep_performance_percentage?: number;
    stage_summary?: { total_in_bed_time_milli?: number; total_awake_time_milli?: number };
    respiratory_rate?: number;
  };
}
interface Cycle {
  start: string;
  score?: { strain?: number; average_heart_rate?: number; max_heart_rate?: number; kilojoule?: number };
}

export async function syncMember(memberId: string): Promise<{ days: number }> {
  const token = await getValidAccessToken(memberId);

  const [recoveries, sleeps, cycles] = await Promise.all([
    fetchCollection<Recovery>("/recovery", token).catch(() => [] as Recovery[]),
    fetchCollection<Sleep>("/activity/sleep", token).catch(() => [] as Sleep[]),
    fetchCollection<Cycle>("/cycle", token).catch(() => [] as Cycle[]),
  ]);

  const byDay = new Map<
    string,
    {
      recoveryScore?: number;
      hrvMs?: number;
      restingHr?: number;
      sleepPerformance?: number;
      sleepDurationMin?: number;
      strain?: number;
      respiratoryRate?: number;
      avgHr?: number;
      maxHr?: number;
      burnedKcal?: number;
    }
  >();

  const upd = (day: string, patch: Partial<NonNullable<ReturnType<(typeof byDay)["get"]>>>) => {
    byDay.set(day, { ...(byDay.get(day) || {}), ...patch });
  };

  for (const r of recoveries) {
    if (!r.created_at || !r.score) continue;
    upd(dayKey(r.created_at), {
      recoveryScore: r.score.recovery_score,
      hrvMs: r.score.hrv_rmssd_milli,
      restingHr: r.score.resting_heart_rate,
    });
  }
  for (const s of sleeps) {
    if (!s.start || !s.score) continue;
    const inBed = s.score.stage_summary?.total_in_bed_time_milli;
    const awake = s.score.stage_summary?.total_awake_time_milli;
    const durMin = inBed != null ? Math.round((inBed - (awake || 0)) / 60000) : undefined;
    upd(dayKey(s.start), {
      sleepPerformance: s.score.sleep_performance_percentage,
      sleepDurationMin: durMin,
      respiratoryRate: s.score.respiratory_rate,
    });
  }
  for (const c of cycles) {
    if (!c.start || !c.score) continue;
    upd(dayKey(c.start), {
      strain: c.score.strain,
      avgHr: c.score.average_heart_rate,
      maxHr: c.score.max_heart_rate,
      burnedKcal: c.score.kilojoule != null ? Math.round(c.score.kilojoule / 4.184) : undefined,
    });
  }

  for (const [day, v] of byDay) {
    const date = new Date(day + "T00:00:00.000Z");
    await prisma.whoopDaily.upsert({
      where: { memberId_date: { memberId, date } },
      create: {
        memberId,
        date,
        recoveryScore: v.recoveryScore ?? null,
        hrvMs: v.hrvMs ?? null,
        restingHr: v.restingHr ?? null,
        sleepPerformance: v.sleepPerformance ?? null,
        sleepDurationMin: v.sleepDurationMin ?? null,
        strain: v.strain ?? null,
        respiratoryRate: v.respiratoryRate ?? null,
        avgHr: v.avgHr ?? null,
        maxHr: v.maxHr ?? null,
        burnedKcal: v.burnedKcal ?? null,
      },
      update: {
        recoveryScore: v.recoveryScore ?? undefined,
        hrvMs: v.hrvMs ?? undefined,
        restingHr: v.restingHr ?? undefined,
        sleepPerformance: v.sleepPerformance ?? undefined,
        sleepDurationMin: v.sleepDurationMin ?? undefined,
        strain: v.strain ?? undefined,
        respiratoryRate: v.respiratoryRate ?? undefined,
        avgHr: v.avgHr ?? undefined,
        maxHr: v.maxHr ?? undefined,
        burnedKcal: v.burnedKcal ?? undefined,
      },
    });
  }

  return { days: byDay.size };
}
