import { prisma } from "@/lib/db";
import DocumentUpload from "@/components/DocumentUpload";
import { labelFor, GENETIC_CATEGORIES } from "@/lib/domain";

export const dynamic = "force-dynamic";

const IMPACT_PILL: Record<string, string> = {
  high: "pill pill-bad",
  moderate: "pill pill-warn",
  protective: "pill pill-ok",
  low: "pill pill-muted",
  info: "pill pill-muted",
};

export default async function GeneticsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const variants = await prisma.geneticVariant.findMany({
    where: { memberId: id },
    orderBy: [{ category: "asc" }, { gene: "asc" }],
  });

  const byCat = new Map<string, typeof variants>();
  for (const v of variants) {
    const arr = byCat.get(v.category) || [];
    arr.push(v);
    byCat.set(v.category, arr);
  }

  return (
    <div className="space-y-6">
      <DocumentUpload memberId={id} />

      {variants.length === 0 ? (
        <p className="text-sm text-muted text-center py-8">
          Загрузите генетический тест (Genotek), выбрав тип «Генетический тест» — Claude извлечёт
          значимые варианты.
        </p>
      ) : (
        <div className="space-y-5">
          {[...byCat.entries()].map(([cat, items]) => (
            <section key={cat} className="space-y-2">
              <h2 className="text-sm font-semibold text-muted uppercase tracking-wide">
                {labelFor(GENETIC_CATEGORIES, cat)}
              </h2>
              <div className="card divide-y">
                {items.map((v) => (
                  <div key={v.id} className="p-4">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      {v.gene && <span className="font-medium text-sm">{v.gene}</span>}
                      {v.genotype && <span className="text-xs tabular-nums text-muted">{v.genotype}</span>}
                      {v.rsid && <span className="text-xs text-muted">{v.rsid}</span>}
                      {v.impact && (
                        <span className={IMPACT_PILL[v.impact] || "pill pill-muted"}>{v.impact}</span>
                      )}
                    </div>
                    {v.interpretation && <p className="text-sm text-muted">{v.interpretation}</p>}
                  </div>
                ))}
              </div>
            </section>
          ))}
          <p className="text-xs text-muted">
            Информационная сводка, не медицинская интерпретация. Обсуждайте значимые находки с врачом-генетиком.
          </p>
        </div>
      )}
    </div>
  );
}
