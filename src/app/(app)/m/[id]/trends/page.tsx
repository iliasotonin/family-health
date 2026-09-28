import { prisma } from "@/lib/db";
import TrendCharts, { type Point } from "@/components/TrendCharts";

export const dynamic = "force-dynamic";

export default async function TrendsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const measurements = await prisma.measurement.findMany({
    where: { memberId: id },
    orderBy: { measuredAt: "asc" },
  });

  const points: Point[] = measurements.map((m) => ({
    code: m.code,
    label: m.label,
    category: m.category,
    value: m.value,
    unit: m.unit,
    refLow: m.refLow,
    refHigh: m.refHigh,
    measuredAt: m.measuredAt.toISOString(),
  }));

  return (
    <div className="space-y-4">
      <TrendCharts points={points} />
    </div>
  );
}
