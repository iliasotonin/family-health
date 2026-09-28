import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { readUpload } from "@/lib/storage";
import { isAnthropicConfigured } from "@/lib/anthropic";
import { extractLabMeasurements, extractGeneticVariants } from "@/lib/parsing";
import { computeFlag } from "@/lib/domain";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isAnthropicConfigured()) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY не задан в .env — парсинг недоступен" },
      { status: 400 }
    );
  }

  const doc = await prisma.document.findUnique({ where: { id } });
  if (!doc) return NextResponse.json({ error: "Документ не найден" }, { status: 404 });

  await prisma.document.update({ where: { id }, data: { status: "parsing", parseError: null } });

  try {
    const buf = await readUpload(doc.storedPath);

    if (doc.kind === "genetic") {
      const result = await extractGeneticVariants(buf, doc.mimeType, doc.fileName);
      // Replace previously parsed variants from this document.
      await prisma.geneticVariant.deleteMany({ where: { documentId: id } });
      if (result.variants.length) {
        await prisma.geneticVariant.createMany({
          data: result.variants.map((v) => ({
            memberId: doc.memberId,
            documentId: id,
            gene: v.gene || null,
            rsid: v.rsid || null,
            genotype: v.genotype || null,
            category: v.category || "other",
            interpretation: v.interpretation || null,
            impact: v.impact || null,
          })),
        });
      }
      await prisma.document.update({
        where: { id },
        data: {
          status: "parsed",
          sourceLab: result.sourceLab || doc.sourceLab,
          summary: result.summary,
          rawExtract: JSON.stringify(result),
        },
      });
      return NextResponse.json({ ok: true, variants: result.variants.length, summary: result.summary });
    }

    // Default: lab panel / imaging → biomarker measurements.
    const result = await extractLabMeasurements(buf, doc.mimeType, doc.fileName);
    const collectedDate = result.collectedDate ? new Date(result.collectedDate) : doc.createdAt;
    await prisma.measurement.deleteMany({ where: { documentId: id } });
    if (result.measurements.length) {
      await prisma.measurement.createMany({
        data: result.measurements.map((m) => ({
          memberId: doc.memberId,
          documentId: id,
          code: m.code,
          label: m.label,
          category: m.category || "other",
          value: m.value,
          unit: m.unit || null,
          refLow: m.refLow ?? null,
          refHigh: m.refHigh ?? null,
          flag: computeFlag(m.value, m.refLow, m.refHigh),
          measuredAt: isNaN(collectedDate.getTime()) ? doc.createdAt : collectedDate,
          source: "lab",
        })),
      });
    }
    await prisma.document.update({
      where: { id },
      data: {
        status: "parsed",
        collectedDate: isNaN(collectedDate.getTime()) ? null : collectedDate,
        sourceLab: result.sourceLab || doc.sourceLab,
        summary: result.summary,
        rawExtract: JSON.stringify(result),
      },
    });
    return NextResponse.json({
      ok: true,
      measurements: result.measurements.length,
      summary: result.summary,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Ошибка парсинга";
    await prisma.document.update({
      where: { id },
      data: { status: "failed", parseError: message },
    });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
