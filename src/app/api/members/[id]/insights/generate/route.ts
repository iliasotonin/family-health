import { NextResponse } from "next/server";
import { isAnthropicConfigured } from "@/lib/anthropic";
import { generateInsight } from "@/lib/insights";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isAnthropicConfigured()) {
    return NextResponse.json({ error: "ANTHROPIC_API_KEY не задан в .env" }, { status: 400 });
  }
  try {
    const insight = await generateInsight(id);
    return NextResponse.json(insight, { status: 201 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Ошибка генерации";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
