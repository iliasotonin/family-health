import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await prisma.whoopConnection.deleteMany({ where: { memberId: id } });
  return NextResponse.json({ ok: true });
}
