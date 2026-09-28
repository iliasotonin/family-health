import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";

const UpdateMember = z.object({
  name: z.string().min(1).max(80).optional(),
  role: z.string().optional(),
  sex: z.string().optional().nullable(),
  birthDate: z.string().optional().nullable(),
  color: z.string().optional(),
});

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json().catch(() => null);
  const parsed = UpdateMember.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }
  const d = parsed.data;
  const member = await prisma.member.update({
    where: { id },
    data: {
      ...(d.name !== undefined ? { name: d.name } : {}),
      ...(d.role !== undefined ? { role: d.role } : {}),
      ...(d.sex !== undefined ? { sex: d.sex || null } : {}),
      ...(d.birthDate !== undefined ? { birthDate: d.birthDate ? new Date(d.birthDate) : null } : {}),
      ...(d.color !== undefined ? { color: d.color } : {}),
    },
  });
  return NextResponse.json(member);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await prisma.member.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
