import { NextResponse } from "next/server";
import { getAuthUrl, signState, isWhoopConfigured } from "@/lib/whoop";

export async function GET(req: Request) {
  if (!isWhoopConfigured()) {
    return NextResponse.json(
      { error: "Whoop не настроен: задайте WHOOP_CLIENT_ID и WHOOP_CLIENT_SECRET в .env" },
      { status: 400 }
    );
  }
  const url = new URL(req.url);
  const memberId = url.searchParams.get("memberId");
  if (!memberId) return NextResponse.json({ error: "memberId required" }, { status: 400 });
  const state = await signState(memberId);
  return NextResponse.redirect(getAuthUrl(state));
}
