import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";

const Body = z.object({
  name: z.string().min(1),
  date: z.string(),
  dose: z.string().optional().nullable(),
  note: z.string().optional().nullable(),
});

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Укажите название и дату" }, { status: 400 });
  const d = parsed.data;
  const at = new Date(d.date);
  const vac = await prisma.vaccination.create({
    data: {
      memberId: id,
      name: d.name,
      date: isNaN(at.getTime()) ? new Date() : at,
      dose: d.dose || null,
      note: d.note || null,
    },
  });
  return NextResponse.json(vac, { status: 201 });
}
