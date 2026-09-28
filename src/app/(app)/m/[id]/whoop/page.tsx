import { prisma } from "@/lib/db";
import { isWhoopConfigured } from "@/lib/whoop";
import WhoopControls from "@/components/whoop/WhoopControls";
import WhoopChart, { type WhoopPoint } from "@/components/whoop/WhoopChart";

export const dynamic = "force-dynamic";

export default async function WhoopPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [conn, recentDesc] = await Promise.all([
    prisma.whoopConnection.findUnique({ where: { memberId: id } }),
    // Full history (desc), then flip to ascending for the chart; the range
    // selector lives client-side.
    prisma.whoopDaily.findMany({ where: { memberId: id }, orderBy: { date: "desc" } }),
  ]);
  const dailies = [...recentDesc].reverse();

  const points: WhoopPoint[] = dailies.map((d) => ({
    date: d.date.toISOString(),
    recoveryScore: d.recoveryScore,
    hrvMs: d.hrvMs,
    sleepPerformance: d.sleepPerformance,
    strain: d.strain,
    restingHr: d.restingHr,
    avgHr: d.avgHr,
    maxHr: d.maxHr,
  }));
  const lastSync = dailies.length ? dailies[dailies.length - 1].date.toISOString() : null;

  return (
    <div className="space-y-5">
      <WhoopControls
        memberId={id}
        connected={Boolean(conn)}
        configured={isWhoopConfigured()}
        lastSync={lastSync}
      />
      {conn && <WhoopChart points={points} />}
    </div>
  );
}
