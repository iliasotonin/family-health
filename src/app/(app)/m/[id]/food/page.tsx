import { prisma } from "@/lib/db";
import FoodLog, { type FoodItem } from "@/components/food/FoodLog";
import FoodTrend, { type DayPoint } from "@/components/food/FoodTrend";
import TargetsForm from "@/components/food/TargetsForm";

export const dynamic = "force-dynamic";

const DAYS = 30;
const dayKey = (d: Date) => d.toISOString().slice(0, 10);

export default async function FoodPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const since = new Date(Date.now() - DAYS * 864e5);
  const [member, entries, weights, whoop] = await Promise.all([
    prisma.member.findUnique({ where: { id } }),
    prisma.foodEntry.findMany({ where: { memberId: id, eatenAt: { gte: since } }, orderBy: { eatenAt: "asc" } }),
    prisma.measurement.findMany({
      where: { memberId: id, code: "weight" },
      orderBy: { measuredAt: "asc" },
    }),
    prisma.whoopDaily.findMany({ where: { memberId: id, date: { gte: since } }, orderBy: { date: "asc" } }),
  ]);

  const kcalTarget = member?.kcalTarget ?? null;
  const proteinTarget = member?.proteinTarget ?? null;

  // Today's entries, in local terms — the log is a "today" view.
  const todayKey = dayKey(new Date());
  const todayItems: FoodItem[] = entries
    .filter((e) => dayKey(e.eatenAt) === todayKey)
    .map((e) => ({
      id: e.id,
      eatenAt: e.eatenAt.toISOString(),
      meal: e.meal,
      title: e.title,
      kcal: e.kcal,
      proteinG: e.proteinG,
      alcoholMl: e.alcoholMl,
      note: e.note,
    }));

  // Daily food totals.
  const perDay = new Map<string, { kcal: number; protein: number; any: boolean }>();
  for (const e of entries) {
    const k = dayKey(e.eatenAt);
    const cur = perDay.get(k) ?? { kcal: 0, protein: 0, any: false };
    cur.kcal += e.kcal ?? 0;
    cur.protein += e.proteinG ?? 0;
    cur.any = true;
    perDay.set(k, cur);
  }

  // Whoop expenditure is stored per day; strain-derived kcal lives on the cycle,
  // so fall back to null when a day is missing.
  const burn = new Map(whoop.map((w) => [dayKey(w.date), w.burnedKcal ?? null]));

  // 7-day rolling mean of weight, carried forward across days without a weigh-in.
  const weightByDay = new Map(weights.map((w) => [dayKey(w.measuredAt), w.value]));
  const rolling = (k: string) => {
    const end = new Date(k + "T00:00:00.000Z").getTime();
    const vals: number[] = [];
    for (let i = 0; i < 7; i++) {
      const v = weightByDay.get(dayKey(new Date(end - i * 864e5)));
      if (v != null) vals.push(v);
    }
    return vals.length ? vals.reduce((s, x) => s + x, 0) / vals.length : null;
  };

  const points: DayPoint[] = [];
  for (let i = DAYS - 1; i >= 0; i--) {
    const k = dayKey(new Date(Date.now() - i * 864e5));
    const f = perDay.get(k);
    points.push({
      date: k,
      kcal: f?.any ? Math.round(f.kcal) : null,
      proteinG: f?.any ? Math.round(f.protein) : null,
      weightAvg: rolling(k),
      burnedKcal: burn.get(k) ?? null,
    });
  }

  return (
    <div className="space-y-6">
      <FoodLog memberId={id} items={todayItems} kcalTarget={kcalTarget} proteinTarget={proteinTarget} />
      <FoodTrend points={points} kcalTarget={kcalTarget} />
      <TargetsForm memberId={id} kcalTarget={kcalTarget} proteinTarget={proteinTarget} />
    </div>
  );
}
