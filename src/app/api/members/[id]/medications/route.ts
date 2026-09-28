import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";

const Body = z.object({
  name: z.string().min(1),
  dose: z.string().optional().nullable(),
  schedule: z.string().optional().nullable(),
  startDate: z.string().optional().nullable(),
  endDate: z.string().optional().nullable(),
  active: z.boolean().default(true),
  note: z.string().optional().nullable(),
});

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Укажите название" }, { status: 400 });
  const d = parsed.data;
  const med = await prisma.medication.create({
    data: {
      memberId: id,
      name: d.name,
      dose: d.dose || null,
      schedule: d.schedule || null,
      startDate: d.startDate ? new Date(d.startDate) : null,
      endDate: d.endDate ? new Date(d.endDate) : null,
      active: d.active,
      note: d.note || null,
    },
  });
  return NextResponse.json(med, { status: 201 });
}
