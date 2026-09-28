import { NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { computeFlag } from "@/lib/domain";

// Manual measurement entry. `bp` is expanded into systolic + diastolic rows.
const Body = z.object({
  code: z.string().min(1),
  label: z.string().min(1),
  category: z.string().default("vitals"),
  unit: z.string().optional().nullable(),
  value: z.number().optional(),
  systolic: z.number().optional(),
  diastolic: z.number().optional(),
  measuredAt: z.string().optional(),
  note: z.string().optional().nullable(),
  refLow: z.number().optional().nullable(),
  refHigh: z.number().optional().nullable(),
});

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }
  const d = parsed.data;
  const at = d.measuredAt ? new Date(d.measuredAt) : new Date();
  const measuredAt = isNaN(at.getTime()) ? new Date() : at;

  const rows: Prisma.MeasurementCreateManyInput[] = [];

  if (d.code === "bp") {
    if (d.systolic == null || d.diastolic == null) {
      return NextResponse.json({ error: "Укажите оба значения давления" }, { status: 400 });
    }
    rows.push({
      memberId: id,
      code: "bp_systolic",
      label: "Систолическое давление",
      category: "vitals",
      value: d.systolic,
      unit: "мм рт.ст.",
      refLow: 90,
      refHigh: 130,
      flag: computeFlag(d.systolic, 90, 130),
      measuredAt,
      source: "manual",
      note: d.note || null,
    });
    rows.push({
      memberId: id,
      code: "bp_diastolic",
      label: "Диастолическое давление",
      category: "vitals",
      value: d.diastolic,
      unit: "мм рт.ст.",
      refLow: 60,
      refHigh: 85,
      flag: computeFlag(d.diastolic, 60, 85),
      measuredAt,
      source: "manual",
      note: d.note || null,
    });
  } else {
    if (d.value == null) return NextResponse.json({ error: "Укажите значение" }, { status: 400 });
    rows.push({
      memberId: id,
      code: d.code,
      label: d.label,
      category: d.category,
      value: d.value,
      unit: d.unit || null,
      refLow: d.refLow ?? null,
      refHigh: d.refHigh ?? null,
      flag: computeFlag(d.value, d.refLow, d.refHigh),
      measuredAt,
      source: "manual",
      note: d.note || null,
    });
  }

  await prisma.measurement.createMany({ data: rows });
  return NextResponse.json({ ok: true, added: rows.length }, { status: 201 });
}
