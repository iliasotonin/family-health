"use client";

import { useMemo, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceArea,
  ReferenceLine,
  CartesianGrid,
} from "recharts";
import { format } from "date-fns";
import { MEASUREMENT_CATEGORIES, labelFor, flagPillClass, flagLabel } from "@/lib/domain";
import { analyteInfo } from "@/lib/analytes";

export interface Point {
  code: string;
  label: string;
  category: string;
  value: number;
  unit: string | null;
  refLow: number | null;
  refHigh: number | null;
  measuredAt: string;
}

// Order categories the way a clinician would scan them.
const CATEGORY_ORDER = [
  "lipids",
  "metabolic",
  "hematology",
  "liver",
  "kidney",
  "hormones",
  "vitamins",
  "inflammation",
  "infection",
  "andrology",
  "vitals",
  "other",
  // Not health metrics — test conditions and procedure records. Kept last.
  "procedure",
  "conditions",
];

const COLORS = ["#0d9488", "#4f46e5", "#db2777", "#ea580c", "#0891b2", "#65a30d"];
const MAX_SERIES = 6;

type Mode = "abs" | "idx" | "ref";

const MODES: { value: Mode; label: string; hint: string }[] = [
  { value: "abs", label: "Абсолютные", hint: "Исходные единицы. Годится, когда шкалы сопоставимы." },
  { value: "idx", label: "% от первого", hint: "Первый замер каждого показателя = 100%. Показывает, что росло, а что падало." },
  { value: "ref", label: "% от нормы", hint: "100% = верхняя граница нормы. Видно, кто ближе к выходу за референс." },
];

export default function TrendCharts({ points }: { points: Point[] }) {
  const [onlyTrends, setOnlyTrends] = useState(false);
  const [mode, setMode] = useState<Mode>("abs");

  const series = useMemo(() => {
    const map = new Map<string, Point[]>();
    for (const p of points) {
      const arr = map.get(p.code) || [];
      arr.push(p);
      map.set(p.code, arr);
    }
    for (const arr of map.values())
      arr.sort((a, b) => new Date(a.measuredAt).getTime() - new Date(b.measuredAt).getTime());
    return map;
  }, [points]);

  const groups = useMemo(() => {
    const byCat = new Map<string, { code: string; label: string; n: number; last: Point }[]>();
    for (const [code, arr] of series) {
      const last = arr[arr.length - 1];
      const cat = last.category || "other";
      const list = byCat.get(cat) || [];
      list.push({ code, label: last.label, n: arr.length, last });
      byCat.set(cat, list);
    }
    for (const list of byCat.values())
      list.sort((a, b) => b.n - a.n || a.label.localeCompare(b.label, "ru"));
    return CATEGORY_ORDER.filter((c) => byCat.has(c)).map((c) => ({
      cat: c,
      title: labelFor(MEASUREMENT_CATEGORIES, c),
      items: byCat.get(c)!,
    }));
  }, [series]);

  const firstCode = useMemo(() => {
    for (const g of groups) {
      const hit = g.items.find((i) => i.n > 1);
      if (hit) return hit.code;
    }
    return groups[0]?.items[0]?.code || "";
  }, [groups]);

  const [selected, setSelected] = useState<string[]>([]);
  const active = selected.length ? selected : firstCode ? [firstCode] : [];

  function toggle(code: string) {
    setSelected((cur) => {
      const base = cur.length ? cur : firstCode ? [firstCode] : [];
      if (base.includes(code)) {
        const next = base.filter((c) => c !== code);
        return next.length ? next : base; // never drop to empty
      }
      if (base.length >= MAX_SERIES) return [...base.slice(1), code];
      return [...base, code];
    });
  }

  // Merge all selected series onto a shared date axis.
  const { chartData, metas, scaleWarning } = useMemo(() => {
    const metas = active
      .map((code, i) => {
        const arr = series.get(code);
        if (!arr) return null;
        const last = arr[arr.length - 1];
        return {
          code,
          label: last.label,
          unit: last.unit,
          refLow: last.refLow,
          refHigh: last.refHigh,
          color: COLORS[i % COLORS.length],
          first: arr[0].value,
          arr,
          last,
        };
      })
      .filter(Boolean) as {
      code: string; label: string; unit: string | null; refLow: number | null;
      refHigh: number | null; color: string; first: number; arr: Point[]; last: Point;
    }[];

    const dates = [...new Set(metas.flatMap((m) => m.arr.map((p) => p.measuredAt)))].sort();
    const chartData = dates.map((d) => {
      const row: Record<string, string | number | null> = {
        t: format(new Date(d), "dd.MM.yy"),
      };
      for (const m of metas) {
        const hit = m.arr.find((p) => p.measuredAt === d);
        if (!hit) {
          row[m.code] = null;
          continue;
        }
        if (mode === "idx") {
          row[m.code] = m.first ? Math.round((hit.value / m.first) * 1000) / 10 : null;
        } else if (mode === "ref") {
          row[m.code] = m.refHigh ? Math.round((hit.value / m.refHigh) * 1000) / 10 : null;
        } else {
          row[m.code] = hit.value;
        }
      }
      return row;
    });

    // Warn when absolute scales differ wildly.
    const maxes = metas.map((m) => Math.max(...m.arr.map((p) => Math.abs(p.value))));
    const scaleWarning =
      mode === "abs" && metas.length > 1 && Math.max(...maxes) / Math.max(Math.min(...maxes), 1e-9) > 10;

    return { chartData, metas, scaleWarning };
  }, [active, series, mode]);

  if (series.size === 0) {
    return (
      <p className="text-sm text-muted text-center py-8">
        Нет данных для графиков. Загрузите анализы или добавьте измерения вручную.
      </p>
    );
  }

  const single = metas.length === 1 ? metas[0] : null;
  const info = single ? analyteInfo(single.code) : null;
  const showRefBand = mode === "abs" && single && single.refLow != null && single.refHigh != null;

  // Y bounds with rounded ticks.
  const vals = chartData.flatMap((r) =>
    metas.map((m) => r[m.code]).filter((v): v is number => typeof v === "number")
  );
  const extra =
    mode === "ref" ? [100] : showRefBand ? [single!.refLow!, single!.refHigh!] : [];
  const bounds = [...vals, ...extra];
  const lo = bounds.length ? Math.min(...bounds) : 0;
  const hi = bounds.length ? Math.max(...bounds) : 1;
  const pad = (hi - lo || Math.abs(hi) * 0.1 || 1) * 0.15;
  const step = niceStep(hi + pad - (lo - pad));
  const yMin = Math.floor((lo - pad) / step) * step;
  const yMax = Math.ceil((hi + pad) / step) * step;

  const totalShown = groups.reduce(
    (s, g) => s + g.items.filter((i) => !onlyTrends || i.n > 1).length,
    0
  );
  const unitSuffix = mode === "abs" ? (single?.unit ? ` ${single.unit}` : "") : "%";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <p className="text-sm text-muted">
          Показателей: {totalShown}. Кликайте, чтобы добавить на график (до {MAX_SERIES}).
        </p>
        <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
          <input
            type="checkbox"
            checked={onlyTrends}
            onChange={(e) => setOnlyTrends(e.target.checked)}
            className="accent-[var(--accent)]"
          />
          Только с историей (2+ замера)
        </label>
      </div>

      <div className="card p-4">
        {/* Selected series + mode switch */}
        <div className="flex items-start justify-between gap-3 flex-wrap mb-3">
          <div className="flex flex-wrap gap-2">
            {metas.map((m) => (
              <span
                key={m.code}
                className="inline-flex items-center gap-1.5 text-sm font-medium"
                style={{ color: m.color }}
              >
                <span className="w-2.5 h-2.5 rounded-full" style={{ background: m.color }} />
                {m.label}
                {metas.length > 1 && (
                  <button
                    onClick={() => toggle(m.code)}
                    className="text-muted hover:text-[var(--bad)] ml-0.5"
                    title="Убрать с графика"
                  >
                    ✕
                  </button>
                )}
              </span>
            ))}
          </div>
          <div className="flex gap-1">
            {MODES.map((md) => (
              <button
                key={md.value}
                onClick={() => setMode(md.value)}
                title={md.hint}
                className={`px-2 py-1 rounded-md text-xs border transition-colors ${
                  mode === md.value
                    ? "bg-[var(--accent)] text-white border-[var(--accent)]"
                    : "bg-surface text-muted hover:text-foreground"
                }`}
              >
                {md.label}
              </button>
            ))}
          </div>
        </div>

        {single && (
          <div className="text-xs text-muted mb-2 flex items-center gap-2 flex-wrap">
            {single.arr.length === 1
              ? "Один замер — динамики пока нет"
              : `${single.arr.length} замера · ${format(new Date(single.arr[0].measuredAt), "dd.MM.yyyy")} — ${format(
                  new Date(single.last.measuredAt),
                  "dd.MM.yyyy"
                )}`}
            {(single.refLow != null || single.refHigh != null) && (
              <span>· норма {refText(single.refLow, single.refHigh, single.unit)}</span>
            )}
            <span className={flagPillClass(flagOf(single.last))}>{flagLabel(flagOf(single.last))}</span>
          </div>
        )}

        {scaleWarning && (
          <p className="text-xs text-[var(--warn)] mb-2">
            Шкалы показателей сильно различаются — для сравнения переключите на «% от первого» или «% от нормы».
          </p>
        )}

        <div style={{ width: "100%", height: 320 }}>
          <ResponsiveContainer>
            <LineChart data={chartData} margin={{ top: 8, right: 12, left: -8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="t" tick={{ fontSize: 12, fill: "var(--muted)" }} />
              <YAxis
                domain={[yMin, yMax]}
                tick={{ fontSize: 12, fill: "var(--muted)" }}
                width={52}
                tickFormatter={(v: number) => String(Math.round(v * 100) / 100)}
              />
              <Tooltip
                contentStyle={{ borderRadius: 8, border: "1px solid var(--border)", fontSize: 13 }}
                formatter={(v, name) => {
                  const m = metas.find((x) => x.code === name);
                  return [`${v}${mode === "abs" ? (m?.unit ? " " + m.unit : "") : "%"}`, m?.label ?? String(name)];
                }}
              />
              {metas.length > 1 && (
                <Legend
                  formatter={(name) => metas.find((x) => x.code === name)?.label ?? String(name)}
                  wrapperStyle={{ fontSize: 12 }}
                />
              )}
              {showRefBand && (
                <ReferenceArea y1={single!.refLow!} y2={single!.refHigh!} fill="var(--ok-weak)" fillOpacity={0.5} />
              )}
              {mode === "ref" && (
                <ReferenceLine y={100} stroke="var(--bad)" strokeDasharray="4 4" />
              )}
              {mode === "idx" && (
                <ReferenceLine y={100} stroke="var(--muted)" strokeDasharray="4 4" />
              )}
              {metas.map((m) => (
                <Line
                  key={m.code}
                  type="monotone"
                  dataKey={m.code}
                  stroke={m.color}
                  strokeWidth={2}
                  dot={{ r: 3, fill: m.color }}
                  activeDot={{ r: 6 }}
                  connectNulls
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="mt-2 text-xs text-muted">
          {mode === "abs" && showRefBand && "Зелёная зона — референсный интервал."}
          {mode === "idx" && "Пунктир 100% — первый замер каждого показателя."}
          {mode === "ref" && "Красный пунктир 100% — верхняя граница нормы. Выше — выход за референс."}
          {unitSuffix && mode !== "abs" ? "" : ""}
        </div>

        {/* Plain-language reference for the selected marker. */}
        {single && info && (
          <div className="mt-3 pt-3 border-t space-y-1.5 text-sm">
            <p>
              <span className="text-muted">Что это: </span>
              {info.what}
            </p>
            <p>
              <span className="text-muted">На что влияет: </span>
              {info.affects}
            </p>
            {(single.refLow != null || single.refHigh != null) && (
              <p>
                <span className="text-muted">Норма этой лаборатории: </span>
                {refText(single.refLow, single.refHigh, single.unit)}
                <span className="text-muted"> (по последнему бланку)</span>
              </p>
            )}
            {info.guideline && (
              <p>
                <span className="text-muted">Ориентиры рекомендаций: </span>
                {info.guideline}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Picker, grouped by category */}
      <div className="space-y-4">
        {groups.map((g) => {
          const items = g.items.filter((i) => !onlyTrends || i.n > 1);
          if (items.length === 0) return null;
          return (
            <div key={g.cat}>
              <h4 className="text-xs font-semibold text-muted uppercase tracking-wide mb-2">
                {g.title} <span className="opacity-60">· {items.length}</span>
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {items.map((c) => {
                  const f = flagOf(c.last);
                  const abnormal = f === "low" || f === "high" || f === "critical";
                  const idx = active.indexOf(c.code);
                  const on = idx >= 0;
                  return (
                    <button
                      key={c.code}
                      onClick={() => toggle(c.code)}
                      title={`${c.label} — ${c.n} замер(ов)`}
                      className={`px-2.5 py-1.5 rounded-lg text-sm border transition-colors ${
                        on
                          ? "text-white"
                          : abnormal
                          ? "bg-surface text-[var(--bad)] border-[var(--bad-weak)] hover:border-[var(--bad)]"
                          : "bg-surface text-muted hover:text-foreground"
                      }`}
                      style={
                        on
                          ? { background: COLORS[idx % COLORS.length], borderColor: COLORS[idx % COLORS.length] }
                          : undefined
                      }
                    >
                      {c.label}
                      <span className="opacity-60 ml-1 text-xs">{c.n > 1 ? `(${c.n})` : "·1"}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** "до 5.2", "от 15", "13.2–17.3" — never "––5.2". */
function refText(lo: number | null, hi: number | null, unit?: string | null): string {
  const u = unit ? ` ${unit}` : "";
  if (lo != null && hi != null) return `${lo}–${hi}${u}`;
  if (hi != null) return `до ${hi}${u}`;
  if (lo != null) return `от ${lo}${u}`;
  return "—";
}

function flagOf(p: Point): string | null {
  if (p.refLow == null && p.refHigh == null) return null;
  if (p.refLow != null && p.value < p.refLow) return "low";
  if (p.refHigh != null && p.value > p.refHigh) return "high";
  return "normal";
}

/** Pick a human-friendly axis step (1/2/5 × 10^n) for the given span. */
function niceStep(span: number): number {
  if (!isFinite(span) || span <= 0) return 1;
  const raw = span / 5;
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const norm = raw / mag;
  const mult = norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 5 ? 5 : 10;
  return mult * mag;
}
