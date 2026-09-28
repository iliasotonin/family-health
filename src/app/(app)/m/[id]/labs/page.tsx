import { prisma } from "@/lib/db";
import DocumentUpload from "@/components/DocumentUpload";
import DocumentRow from "@/components/DocumentRow";
import { flagPillClass, flagLabel, labelFor, MEASUREMENT_CATEGORIES } from "@/lib/domain";
import { format } from "date-fns";

export const dynamic = "force-dynamic";

export default async function LabsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const documents = await prisma.document.findMany({
    where: { memberId: id },
    orderBy: [{ collectedDate: "desc" }, { createdAt: "desc" }],
    include: { _count: { select: { measurements: true, geneticVariants: true } } },
  });

  const measurements = await prisma.measurement.findMany({
    where: { memberId: id },
    orderBy: { measuredAt: "desc" },
  });

  // Latest value per code.
  const latestByCode = new Map<string, (typeof measurements)[number]>();
  for (const m of measurements) if (!latestByCode.has(m.code)) latestByCode.set(m.code, m);
  const latest = [...latestByCode.values()];

  // Group by category.
  const byCategory = new Map<string, typeof latest>();
  for (const m of latest) {
    const arr = byCategory.get(m.category) || [];
    arr.push(m);
    byCategory.set(m.category, arr);
  }

  return (
    <div className="space-y-6">
      <DocumentUpload memberId={id} />

      {documents.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-muted uppercase tracking-wide">Документы</h2>
          <div className="card divide-y">
            {documents.map((d) => (
              <DocumentRow
                key={d.id}
                doc={{
                  id: d.id,
                  kind: d.kind,
                  fileName: d.fileName,
                  status: d.status,
                  parseError: d.parseError,
                  summary: d.summary,
                  sourceLab: d.sourceLab,
                  collectedDate: d.collectedDate,
                  createdAt: d.createdAt,
                  measurementCount: d._count.measurements,
                  variantCount: d._count.geneticVariants,
                }}
              />
            ))}
          </div>
        </section>
      )}

      {latest.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-sm font-semibold text-muted uppercase tracking-wide">
            Актуальные показатели
          </h2>
          {[...byCategory.entries()].map(([cat, items]) => (
            <div key={cat} className="space-y-1">
              <h3 className="text-sm font-medium">{labelFor(MEASUREMENT_CATEGORIES, cat)}</h3>
              <div className="card divide-y">
                {items.map((m) => (
                  <div key={m.id} className="flex items-center justify-between p-3 gap-3">
                    <div className="min-w-0">
                      <div className="text-sm truncate">{m.label}</div>
                      <div className="text-xs text-muted">
                        {format(m.measuredAt, "dd.MM.yyyy")}
                        {m.refLow != null || m.refHigh != null
                          ? ` · норма ${m.refLow ?? "–"}–${m.refHigh ?? "–"}${m.unit ? " " + m.unit : ""}`
                          : ""}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-sm tabular-nums font-medium">
                        {m.value}
                        {m.unit ? ` ${m.unit}` : ""}
                      </span>
                      {m.flag && <span className={flagPillClass(m.flag)}>{flagLabel(m.flag)}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </section>
      )}

      {documents.length === 0 && latest.length === 0 && (
        <p className="text-sm text-muted text-center py-8">
          Загрузите первый анализ или генетический тест выше.
        </p>
      )}
    </div>
  );
}
