import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyState, exchangeCode, fetchProfile, syncMember } from "@/lib/whoop";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");
  const origin = url.origin;

  if (error) return NextResponse.redirect(`${origin}/?whoop_error=${encodeURIComponent(error)}`);
  if (!code || !state) return NextResponse.redirect(`${origin}/?whoop_error=missing_code`);

  const memberId = await verifyState(state);
  if (!memberId) return NextResponse.redirect(`${origin}/?whoop_error=bad_state`);

  try {
    const tok = await exchangeCode(code);
    const profile = await fetchProfile(tok.access_token);
    await prisma.whoopConnection.upsert({
      where: { memberId },
      create: {
        memberId,
        whoopUserId: profile.user_id != null ? String(profile.user_id) : null,
        accessToken: tok.access_token,
        refreshToken: tok.refresh_token,
        expiresAt: new Date(Date.now() + tok.expires_in * 1000),
        scopes: tok.scope || null,
      },
      update: {
        whoopUserId: profile.user_id != null ? String(profile.user_id) : null,
        accessToken: tok.access_token,
        refreshToken: tok.refresh_token,
        expiresAt: new Date(Date.now() + tok.expires_in * 1000),
        scopes: tok.scope || null,
      },
    });
    // Best-effort first sync.
    await syncMember(memberId).catch(() => {});
    return NextResponse.redirect(`${origin}/m/${memberId}/whoop?connected=1`);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "whoop_failed";
    return NextResponse.redirect(`${origin}/m/${memberId}/whoop?whoop_error=${encodeURIComponent(msg)}`);
  }
}
