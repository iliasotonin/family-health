import Link from "next/link";
import { prisma } from "@/lib/db";
import { flagPillClass, flagLabel } from "@/lib/domain";
import { format } from "date-fns";

export const dynamic = "force-dynamic";

export default async function MemberOverview({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  // Latest value per measurement code.
  const measurements = await prisma.measurement.findMany({
    where: { memberId: id },
    orderBy: { measuredAt: "desc" },
  });
  const latestByCode = new Map<string, (typeof measurements)[number]>();
  for (const m of measurements) if (!latestByCode.has(m.code)) latestByCode.set(m.code, m);
  const latest = [...latestByCode.values()];
  const flagged = latest.filter((m) => m.flag === "low" || m.flag === "high" || m.flag === "critical");

  const [whoop, activeMeds, insights, docCount] = await Promise.all([
    prisma.whoopDaily.findFirst({ where: { memberId: id }, orderBy: { date: "desc" } }),
    prisma.medication.findMany({ where: { memberId: id, active: true }, orderBy: { name: "asc" } }),
    prisma.insight.findMany({ where: { memberId: id }, orderBy: { createdAt: "desc" }, take: 3 }),
    prisma.document.count({ where: { memberId: id } }),
  ]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Stat label="Показателей" value={latest.length} href={`/m/${id}/trends`} />
        <Stat label="Вне нормы" value={flagged.length} tone={flagged.length ? "bad" : "ok"} href={`/m/${id}/labs`} />
        <Stat label="Документов" value={docCount} href={`/m/${id}/labs`} />
        <Stat
          label="Whoop recovery"
          value={whoop?.recoveryScore != null ? `${Math.round(whoop.recoveryScore)}%` : "—"}
          href={`/m/${id}/whoop`}
        />
      </div>

      {flagged.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-muted uppercase tracking-wide">Требует внимания</h2>
          <div className="card divide-y">
            {flagged.slice(0, 8).map((m) => (
              <div key={m.id} className="flex items-center justify-between p-3">
                <div>
                  <div className="font-medium text-sm">{m.label}</div>
                  <div className="text-xs text-muted">{format(m.measuredAt, "dd.MM.yyyy")}</div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm tabular-nums">
                    {m.value}
                    {m.unit ? ` ${m.unit}` : ""}
                  </span>
                  <span className={flagPillClass(m.flag)}>{flagLabel(m.flag)}</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {activeMeds.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-muted uppercase tracking-wide">Приём сейчас</h2>
          <div className="flex flex-wrap gap-2">
            {activeMeds.map((med) => (
              <span key={med.id} className="pill pill-muted">
                {med.name}
                {med.dose ? ` · ${med.dose}` : ""}
              </span>
            ))}
          </div>
        </section>
      )}

      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-muted uppercase tracking-wide">Инсайты</h2>
          <Link href={`/m/${id}/insights`} className="text-sm text-[var(--accent)]">
            Все →
          </Link>
        </div>
        {insights.length === 0 ? (
          <p className="text-sm text-muted">
            Пока нет. Сгенерируйте на вкладке{" "}
            <Link href={`/m/${id}/insights`} className="text-[var(--accent)]">
              Инсайты
            </Link>
            .
          </p>
        ) : (
          <div className="space-y-2">
            {insights.map((i) => (
              <div key={i.id} className="card p-4">
                <div className="font-medium text-sm mb-1">{i.title}</div>
                <p className="text-sm text-muted line-clamp-3 whitespace-pre-wrap">{i.body}</p>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function Stat({
  label,
  value,
  href,
  tone,
}: {
  label: string;
  value: React.ReactNode;
  href: string;
  tone?: "ok" | "bad";
}) {
  return (
    <Link href={href} className="card p-3 hover:shadow-md transition-shadow">
      <div className="text-xs text-muted">{label}</div>
      <div
        className={`text-xl font-semibold ${
          tone === "bad" ? "text-[var(--bad)]" : tone === "ok" ? "text-[var(--ok)]" : ""
        }`}
      >
        {value}
      </div>
    </Link>
  );
}
