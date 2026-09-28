import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";

const Body = z.object({
  date: z.string().optional(),
  mood: z.number().min(1).max(5).optional().nullable(),
  symptoms: z.string().optional().nullable(),
  note: z.string().optional().nullable(),
});

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Некорректные данные" }, { status: 400 });
  const d = parsed.data;
  const at = d.date ? new Date(d.date) : new Date();
  const entry = await prisma.diaryEntry.create({
    data: {
      memberId: id,
      date: isNaN(at.getTime()) ? new Date() : at,
      mood: d.mood ?? null,
      symptoms: d.symptoms || null,
      note: d.note || null,
    },
  });
  return NextResponse.json(entry, { status: 201 });
}
