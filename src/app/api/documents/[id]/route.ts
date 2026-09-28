import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { deleteUpload } from "@/lib/storage";

export const runtime = "nodejs";

// Delete a document, its file on disk, and everything parsed from it.
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const doc = await prisma.document.findUnique({ where: { id } });
  if (!doc) return NextResponse.json({ error: "Документ не найден" }, { status: 404 });

  await prisma.measurement.deleteMany({ where: { documentId: id } });
  await prisma.geneticVariant.deleteMany({ where: { documentId: id } });
  await prisma.document.delete({ where: { id } });
  await deleteUpload(doc.storedPath).catch(() => {});

  return NextResponse.json({ ok: true });
}
