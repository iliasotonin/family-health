import { NextResponse } from "next/server";
import {
  SESSION_COOKIE,
  NOT_CONFIGURED_MESSAGE,
  authSecret,
  checkPassword,
  passwordConfigured,
  sessionToken,
} from "@/lib/auth";
import { clientKey, checkLocked, registerFailure, registerSuccess } from "@/lib/rate-limit";

export async function POST(req: Request) {
  // Refuse outright rather than failing every password: a misconfigured instance
  // should say so, not look like a wrong-password loop.
  if (!authSecret() || !passwordConfigured()) {
    return NextResponse.json({ error: NOT_CONFIGURED_MESSAGE }, { status: 503 });
  }

  const key = clientKey(req);

  const lockedMs = checkLocked(key);
  if (lockedMs > 0) {
    const sec = Math.ceil(lockedMs / 1000);
    return NextResponse.json(
      { error: `Слишком много попыток. Повторите через ${sec} с.` },
      { status: 429, headers: { "Retry-After": String(sec) } }
    );
  }

  const { password } = await req.json().catch(() => ({ password: "" }));

  if (!checkPassword(String(password || ""))) {
    const blockedMs = registerFailure(key);
    const msg =
      blockedMs > 0
        ? `Неверный пароль. Следующая попытка через ${Math.ceil(blockedMs / 1000)} с.`
        : "Неверный пароль";
    return NextResponse.json({ error: msg }, { status: 401 });
  }

  registerSuccess(key);
  const token = await sessionToken();
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });
  return res;
}
