"use client";

import { useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { format } from "date-fns";

export interface WhoopPoint {
  date: string;
  recoveryScore: number | null;
  hrvMs: number | null;
  sleepPerformance: number | null;
  strain: number | null;
  restingHr: number | null;
  avgHr: number | null;
  maxHr: number | null;
}

const METRICS = [
  { key: "avgHr", label: "Пульс средний за сутки", color: "#be123c", hint: "включает день, а не только сон" },
  { key: "restingHr", label: "Пульс покоя (во сне)", color: "#db2777", hint: null },
  { key: "hrvMs", label: "HRV, мс", color: "#4f46e5", hint: null },
  { key: "recoveryScore", label: "Recovery %", color: "#16a34a", hint: null },
  { key: "sleepPerformance", label: "Сон %", color: "#0891b2", hint: null },
  { key: "strain", label: "Strain", color: "#ea580c", hint: null },
  { key: "maxHr", label: "Пульс максимальный за сутки", color: "#7c3aed", hint: "отражает интенсивность нагрузки" },
] as const;

const RANGES = [
  { label: "30 дней", days: 30 },
  { label: "90 дней", days: 90 },
  { label: "год", days: 365 },
  { label: "всё", days: 0 },
] as const;

// Monthly means — a 3-year daily series is unreadable raw.
function monthlyMean(rows: WhoopPoint[], key: keyof WhoopPoint) {
  const buckets = new Map<string, number[]>();
  for (const r of rows) {
    const v = r[key];
    if (typeof v !== "number") continue;
    const k = r.date.slice(0, 7);
    const list = buckets.get(k);
    if (list) list.push(v);
    else buckets.set(k, [v]);
  }
  return [...buckets.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => ({ t: k, value: v.reduce((s, x) => s + x, 0) / v.length }));
}

export default function WhoopChart({ points }: { points: WhoopPoint[] }) {
  const [days, setDays] = useState<number>(90);

  if (points.length === 0) {
    return <p className="text-sm text-muted text-center py-6">Нет данных. Нажмите «Синхронизировать».</p>;
  }

  const shown = days > 0 ? points.slice(-days) : points;
  // Beyond a year of daily points the line turns to noise — average by month.
  const aggregate = shown.length > 400;

  const series = (key: keyof WhoopPoint) =>
    aggregate
      ? monthlyMean(shown, key)
      : shown.map((p) => ({
          t: format(new Date(p.date), "dd.MM"),
          value: typeof p[key] === "number" ? (p[key] as number) : null,
        }));

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 flex-wrap">
        {RANGES.map((r) => (
          <button
            key={r.label}
            onClick={() => setDays(r.days)}
            className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
              days === r.days
                ? "bg-[var(--accent,#0d9488)] text-white border-transparent"
                : "border-[var(--border)] text-muted hover:text-inherit"
            }`}
          >
            {r.label}
          </button>
        ))}
        <span className="text-xs text-muted ml-auto">
          {points.length} дней в базе
          {aggregate && " · графики усреднены по месяцам"}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {METRICS.map((m) => {
          const data = series(m.key);
          if (!data.some((d) => d.value != null)) return null;
          return (
            <div key={m.key} className="card p-4">
              <h3 className="font-medium text-sm">{m.label}</h3>
              {m.hint && <p className="text-xs text-muted mb-1">{m.hint}</p>}
              <div style={{ width: "100%", height: 180 }} className="mt-1">
                <ResponsiveContainer>
                  <LineChart data={data} margin={{ top: 4, right: 8, left: -12, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="t" tick={{ fontSize: 11, fill: "var(--muted)" }} minTickGap={20} />
                    <YAxis tick={{ fontSize: 11, fill: "var(--muted)" }} width={36} domain={["auto", "auto"]} />
                    <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid var(--border)", fontSize: 12 }} />
                    <Line
                      type="monotone"
                      dataKey="value"
                      name={m.label}
                      stroke={m.color}
                      strokeWidth={2}
                      dot={false}
                      connectNulls
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
