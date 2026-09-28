// Shared single-password gate. One family, one password, one session cookie.
// Uses Web Crypto so it runs in both edge middleware and node route handlers.

export const SESSION_COOKIE = "fh_session";

// No fallback secret, on purpose. The source is public: any default written here
// would let a reader mint a valid session for every instance that forgot to set one.
const MIN_SECRET_LENGTH = 32;

/** The signing secret, or null when it is missing, too short, or still the .env.example text. */
export function authSecret(): string | null {
  const s = process.env.AUTH_SECRET ?? "";
  if (s.length < MIN_SECRET_LENGTH || s.startsWith("generate-with")) return null;
  return s;
}

/** Password gate is configured only with a real password, never the .env.example placeholder. */
export function passwordConfigured(): boolean {
  const p = process.env.APP_PASSWORD ?? "";
  return p.length > 0 && p !== "change-me";
}

export const NOT_CONFIGURED_MESSAGE =
  "Сервер не настроен: задайте в .env AUTH_SECRET (openssl rand -hex 32) и собственный APP_PASSWORD.";

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

/** The opaque token stored in the session cookie once authenticated. */
export async function sessionToken(): Promise<string> {
  return hmac("family-health-authenticated-v1");
}

export async function isValidSession(token: string | undefined | null): Promise<boolean> {
  // Without a secret nothing is valid: every request lands on /login, which explains why.
  if (!token || !authSecret()) return false;
  const expected = await sessionToken();
  // Constant-time-ish compare.
  if (token.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < token.length; i++) diff |= token.charCodeAt(i) ^ expected.charCodeAt(i);
  return diff === 0;
}

export function checkPassword(candidate: string): boolean {
  if (!passwordConfigured()) return false;
  const expected = process.env.APP_PASSWORD as string;
  if (candidate.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < candidate.length; i++)
    diff |= candidate.charCodeAt(i) ^ expected.charCodeAt(i);
  return diff === 0;
}
