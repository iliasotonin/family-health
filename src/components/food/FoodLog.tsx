"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export interface FoodItem {
  id: string;
  eatenAt: string;
  meal: string;
  title: string;
  kcal: number | null;
  proteinG: number | null;
  alcoholMl: number | null;
  note: string | null;
}

const MEALS = [
  { key: "breakfast", label: "Завтрак" },
  { key: "lunch", label: "Обед" },
  { key: "dinner", label: "Ужин" },
  { key: "snack", label: "Перекус" },
  { key: "drink", label: "Напиток" },
] as const;

const mealLabel = (k: string) => MEALS.find((m) => m.key === k)?.label ?? "Приём пищи";

function Ring({ value, target, unit, label }: { value: number; target: number | null; unit: string; label: string }) {
  const pct = target ? Math.min(100, (value / target) * 100) : 0;
  const over = target != null && value > target;
  return (
    <div className="card p-4">
      <p className="text-xs text-muted">{label}</p>
      <p className="text-2xl font-semibold mt-0.5 tabular-nums">
        {Math.round(value)}
        <span className="text-sm font-normal text-muted">
          {target ? ` / ${target}` : ""} {unit}
        </span>
      </p>
      {target != null && (
        <>
          <div className="h-1.5 rounded-full bg-[var(--border)] mt-2 overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${pct}%`, background: over ? "#dc2626" : "var(--accent)" }}
            />
          </div>
          <p className="text-xs text-muted mt-1">
            {over ? `перебор на ${Math.round(value - target)}` : `осталось ${Math.round(target - value)}`} {unit}
          </p>
        </>
      )}
    </div>
  );
}

export default function FoodLog({
  memberId,
  items,
  kcalTarget,
  proteinTarget,
}: {
  memberId: string;
  items: FoodItem[];
  kcalTarget: number | null;
  proteinTarget: number | null;
}) {
  const router = useRouter();
  const [meal, setMeal] = useState<string>("breakfast");
  const [title, setTitle] = useState("");
  const [kcal, setKcal] = useState("");
  const [protein, setProtein] = useState("");
  const [alcohol, setAlcohol] = useState("");
  const [busy, setBusy] = useState(false);

  const num = (s: string) => (s.trim() === "" ? null : Number(s.replace(",", ".")));

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setBusy(true);
    const res = await fetch(`/api/members/${memberId}/food`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        meal,
        title: title.trim(),
        kcal: num(kcal),
        proteinG: num(protein),
        alcoholMl: num(alcohol),
      }),
    });
    setBusy(false);
    if (res.ok) {
      setTitle("");
      setKcal("");
      setProtein("");
      setAlcohol("");
      router.refresh();
    }
  }

  async function remove(id: string) {
    await fetch(`/api/food/${id}`, { method: "DELETE" });
    router.refresh();
  }

  const kcalSum = items.reduce((s, i) => s + (i.kcal ?? 0), 0);
  const proteinSum = items.reduce((s, i) => s + (i.proteinG ?? 0), 0);
  const alcoholSum = items.reduce((s, i) => s + (i.alcoholMl ?? 0), 0);

  return (
    <section className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <Ring value={kcalSum} target={kcalTarget} unit="ккал" label="Сегодня съедено" />
        <Ring value={proteinSum} target={proteinTarget} unit="г" label="Белок" />
        <div className="card p-4">
          <p className="text-xs text-muted">Алкоголь</p>
          <p className="text-2xl font-semibold mt-0.5 tabular-nums">
            {alcoholSum ? Math.round(alcoholSum) : "—"}
            <span className="text-sm font-normal text-muted"> мл спирта</span>
          </p>
          <p className="text-xs text-muted mt-1">
            {alcoholSum ? `≈ ${Math.round(alcoholSum * 7.1)} ккал` : "сегодня чисто"}
          </p>
        </div>
      </div>

      <form onSubmit={add} className="card p-4 space-y-3">
        <div className="flex gap-1.5 flex-wrap">
          {MEALS.map((m) => (
            <button
              key={m.key}
              type="button"
              onClick={() => setMeal(m.key)}
              className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                meal === m.key
                  ? "border-[var(--accent)] bg-[var(--accent-weak)] font-medium"
                  : "border-[var(--border)] text-muted"
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
        <input
          className="input"
          placeholder="Что съел — напр. «салат с моцареллой и вялеными томатами»"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <div className="grid grid-cols-3 gap-2">
          <input className="input" inputMode="decimal" placeholder="ккал" value={kcal} onChange={(e) => setKcal(e.target.value)} />
          <input className="input" inputMode="decimal" placeholder="белок, г" value={protein} onChange={(e) => setProtein(e.target.value)} />
          <input className="input" inputMode="decimal" placeholder="спирт, мл" value={alcohol} onChange={(e) => setAlcohol(e.target.value)} />
        </div>
        <button className="btn btn-primary w-full" disabled={busy || !title.trim()}>
          {busy ? "Сохраняю…" : "Добавить"}
        </button>
        <p className="text-xs text-muted">
          Спирт в мл: бокал вина 150 мл ≈ 18 мл, банка пива 0,5 ≈ 20 мл, рюмка крепкого 50 мл ≈ 20 мл.
        </p>
      </form>

      <div className="space-y-2">
        {items.length === 0 && <p className="text-sm text-muted text-center py-4">Сегодня записей нет.</p>}
        {items.map((i) => (
          <div key={i.id} className="card p-3 flex items-start gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted">
                {mealLabel(i.meal)} · {new Date(i.eatenAt).toLocaleTimeString("ru", { hour: "2-digit", minute: "2-digit" })}
              </p>
              <p className="text-sm">{i.title}</p>
              <p className="text-xs text-muted mt-0.5 tabular-nums">
                {i.kcal != null ? `${i.kcal} ккал` : "ккал не указаны"}
                {i.proteinG != null ? ` · белок ${i.proteinG} г` : ""}
                {i.alcoholMl ? ` · спирт ${i.alcoholMl} мл` : ""}
              </p>
            </div>
            <button onClick={() => remove(i.id)} className="text-xs text-muted hover:text-red-600 shrink-0">
              удалить
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}
