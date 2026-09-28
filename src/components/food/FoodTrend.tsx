"use client";

import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  ReferenceLine,
  Legend,
} from "recharts";
import { format } from "date-fns";

export interface DayPoint {
  date: string;
  kcal: number | null;
  proteinG: number | null;
  weightAvg: number | null; // 7-day rolling mean
  burnedKcal: number | null; // from Whoop
}

export default function FoodTrend({
  points,
  kcalTarget,
}: {
  points: DayPoint[];
  kcalTarget: number | null;
}) {
  const logged = points.filter((p) => p.kcal != null);
  if (logged.length === 0) {
    return (
      <p className="text-sm text-muted text-center py-6">
        Пока нечего показывать — записи появятся здесь через несколько дней ведения дневника.
      </p>
    );
  }

  const data = points.map((p) => ({ ...p, t: format(new Date(p.date), "dd.MM") }));
  const hasWeight = points.some((p) => p.weightAvg != null);

  return (
    <div className="card p-4">
      <h3 className="font-medium text-sm">Съедено, потрачено и вес</h3>
      <p className="text-xs text-muted mb-2">
        Столбцы — съедено, линия — расход по Whoop{hasWeight ? ", жёлтая — вес (среднее за 7 дней)" : ""}.
      </p>
      <div style={{ width: "100%", height: 240 }}>
        <ResponsiveContainer>
          <ComposedChart data={data} margin={{ top: 4, right: 8, left: -12, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="t" tick={{ fontSize: 11, fill: "var(--muted)" }} minTickGap={20} />
            <YAxis yAxisId="kcal" tick={{ fontSize: 11, fill: "var(--muted)" }} width={40} />
            {hasWeight && (
              <YAxis
                yAxisId="kg"
                orientation="right"
                domain={["dataMin - 1", "dataMax + 1"]}
                tick={{ fontSize: 11, fill: "var(--muted)" }}
                width={38}
              />
            )}
            <Tooltip
              contentStyle={{ borderRadius: 8, border: "1px solid var(--border)", fontSize: 12 }}
              formatter={(v, name) => [typeof v === "number" ? Math.round(v * 10) / 10 : v, name]}
            />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            {kcalTarget != null && (
              <ReferenceLine
                yAxisId="kcal"
                y={kcalTarget}
                stroke="#0d9488"
                strokeDasharray="4 4"
                label={{ value: `цель ${kcalTarget}`, position: "insideTopRight", fontSize: 10, fill: "#0d9488" }}
              />
            )}
            <Bar yAxisId="kcal" dataKey="kcal" name="Съедено, ккал" fill="#4f46e5" radius={[3, 3, 0, 0]} />
            <Line
              yAxisId="kcal"
              type="monotone"
              dataKey="burnedKcal"
              name="Потрачено, ккал"
              stroke="#ea580c"
              strokeWidth={2}
              dot={false}
              connectNulls
            />
            {hasWeight && (
              <Line
                yAxisId="kg"
                type="monotone"
                dataKey="weightAvg"
                name="Вес, кг"
                stroke="#ca8a04"
                strokeWidth={2}
                // Dots, not a bare line: a single weigh-in has nothing to connect to.
                dot={{ r: 2.5, fill: "#ca8a04" }}
                connectNulls
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
