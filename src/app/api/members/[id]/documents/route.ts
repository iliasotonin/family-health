import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { saveUpload } from "@/lib/storage";

export const runtime = "nodejs";

// Upload a document (lab PDF, genetic export, image). Stores the file and
// creates a Document row with status "uploaded". Parsing is a separate call.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const member = await prisma.member.findUnique({ where: { id } });
  if (!member) return NextResponse.json({ error: "Член семьи не найден" }, { status: 404 });

  const form = await req.formData();
  const file = form.get("file");
  const kind = String(form.get("kind") || "lab_panel");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Файл не передан" }, { status: 400 });
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  const { storedPath, sizeBytes } = await saveUpload(id, file.name, bytes);

  const doc = await prisma.document.create({
    data: {
      memberId: id,
      kind,
      fileName: file.name,
      storedPath,
      mimeType: file.type || "application/octet-stream",
      sizeBytes,
      status: "uploaded",
    },
  });

  return NextResponse.json(doc, { status: 201 });
}
