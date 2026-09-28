import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";

const MEALS = ["breakfast", "lunch", "dinner", "snack", "drink", "other"] as const;

const Body = z.object({
  eatenAt: z.string().optional(),
  meal: z.enum(MEALS).optional(),
  title: z.string().min(1),
  kcal: z.number().int().min(0).max(10000).optional().nullable(),
  proteinG: z.number().min(0).max(500).optional().nullable(),
  alcoholMl: z.number().min(0).max(500).optional().nullable(),
  note: z.string().optional().nullable(),
});

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Некорректные данные" }, { status: 400 });
  const d = parsed.data;
  const at = d.eatenAt ? new Date(d.eatenAt) : new Date();
  const entry = await prisma.foodEntry.create({
    data: {
      memberId: id,
      eatenAt: isNaN(at.getTime()) ? new Date() : at,
      meal: d.meal ?? "other",
      title: d.title,
      kcal: d.kcal ?? null,
      proteinG: d.proteinG ?? null,
      alcoholMl: d.alcoholMl ?? null,
      note: d.note || null,
    },
  });
  return NextResponse.json(entry, { status: 201 });
}

const Targets = z.object({
  kcalTarget: z.number().int().min(500).max(8000).nullable(),
  proteinTarget: z.number().int().min(0).max(500).nullable(),
});

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const parsed = Targets.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Некорректные данные" }, { status: 400 });
  const member = await prisma.member.update({ where: { id }, data: parsed.data });
  return NextResponse.json({ kcalTarget: member.kcalTarget, proteinTarget: member.proteinTarget });
}
