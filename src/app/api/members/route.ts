import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { MEMBER_COLORS } from "@/lib/domain";

const CreateMember = z.object({
  name: z.string().min(1).max(80),
  role: z.string().default("member"),
  sex: z.string().optional().nullable(),
  birthDate: z.string().optional().nullable(),
  color: z.string().optional(),
});

export async function GET() {
  const members = await prisma.member.findMany({ orderBy: { createdAt: "asc" } });
  return NextResponse.json(members);
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = CreateMember.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }
  const count = await prisma.member.count();
  const data = parsed.data;
  const member = await prisma.member.create({
    data: {
      name: data.name,
      role: data.role,
      sex: data.sex || null,
      birthDate: data.birthDate ? new Date(data.birthDate) : null,
      color: data.color || MEMBER_COLORS[count % MEMBER_COLORS.length],
    },
  });
  return NextResponse.json(member, { status: 201 });
}
