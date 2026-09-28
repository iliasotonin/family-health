import { prisma } from "@/lib/db";
import GenerateInsightButton, { DeleteInsightButton } from "@/components/InsightsClient";
import MiniMarkdown from "@/components/MiniMarkdown";
import { format } from "date-fns";

export const dynamic = "force-dynamic";

const SEV_PILL: Record<string, string> = {
  urgent: "pill pill-bad",
  attention: "pill pill-warn",
  info: "pill pill-ok",
};
const SEV_LABEL: Record<string, string> = {
  urgent: "Важно",
  attention: "Внимание",
  info: "Инфо",
};

export default async function InsightsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const insights = await prisma.insight.findMany({
    where: { memberId: id },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-5">
      <div className="card p-4 space-y-3">
        <div>
          <h2 className="font-medium">AI-сводка по здоровью</h2>
          <p className="text-sm text-muted">
            Claude посмотрит на анализы, Whoop, дневник и генетику и подготовит обзор динамики, флаги и
            вопросы к врачу. Это информационная навигация, не диагноз.
          </p>
        </div>
        <GenerateInsightButton memberId={id} />
      </div>

      {insights.length === 0 ? (
        <p className="text-sm text-muted text-center py-6">Пока нет сводок. Сгенерируйте первую.</p>
      ) : (
        <div className="space-y-3">
          {insights.map((i) => (
            <div key={i.id} className="card p-4">
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={SEV_PILL[i.severity] || "pill pill-muted"}>
                    {SEV_LABEL[i.severity] || i.severity}
                  </span>
                  <span className="font-medium">{i.title}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs text-muted">{format(i.createdAt, "dd.MM.yyyy HH:mm")}</span>
                  <DeleteInsightButton id={i.id} />
                </div>
              </div>
              <MiniMarkdown text={i.body} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
