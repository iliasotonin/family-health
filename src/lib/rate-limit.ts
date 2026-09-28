// In-memory login throttle. Single-instance app, so a Map is enough.
// Failed attempts lock the caller out with escalating backoff; success clears it.

interface Entry {
  fails: number;
  blockedUntil: number; // epoch ms
  last: number;
}

const attempts = new Map<string, Entry>();

const FREE_ATTEMPTS = 5; // no delay for the first N failures
const MAX_BLOCK_MS = 15 * 60_000; // cap at 15 minutes
const FORGET_MS = 60 * 60_000; // drop stale entries after an hour of quiet

function sweep(now: number) {
  for (const [key, e] of attempts) {
    if (now - e.last > FORGET_MS && now > e.blockedUntil) attempts.delete(key);
  }
}

/** Client identity: proxy header first (Cloudflare/nginx), else socket-less fallback. */
export function clientKey(req: Request): string {
  const h = req.headers;
  const fwd =
    h.get("cf-connecting-ip") ||
    h.get("x-real-ip") ||
    h.get("x-forwarded-for")?.split(",")[0]?.trim();
  return fwd || "local";
}

/** Returns remaining lockout in ms, or 0 if the caller may attempt a login. */
export function checkLocked(key: string): number {
  const now = Date.now();
  sweep(now);
  const e = attempts.get(key);
  if (!e) return 0;
  return e.blockedUntil > now ? e.blockedUntil - now : 0;
}

export function registerFailure(key: string): number {
  const now = Date.now();
  const e = attempts.get(key) || { fails: 0, blockedUntil: 0, last: now };
  e.fails += 1;
  e.last = now;
  if (e.fails > FREE_ATTEMPTS) {
    // 2s, 4s, 8s, 16s ... capped.
    const backoff = Math.min(MAX_BLOCK_MS, 2000 * 2 ** (e.fails - FREE_ATTEMPTS - 1));
    e.blockedUntil = now + backoff;
  }
  attempts.set(key, e);
  return e.blockedUntil > now ? e.blockedUntil - now : 0;
}

export function registerSuccess(key: string): void {
  attempts.delete(key);
}
