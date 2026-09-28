"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { VITAL_PRESETS } from "@/lib/domain";

export default function QuickVitals({ memberId }: { memberId: string }) {
  const router = useRouter();
  const [preset, setPreset] = useState<(typeof VITAL_PRESETS)[number]>(VITAL_PRESETS[0]);
  const [value, setValue] = useState("");
  const [systolic, setSystolic] = useState("");
  const [diastolic, setDiastolic] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const body: Record<string, unknown> = {
      code: preset.code,
      label: preset.label,
      category: preset.category,
      unit: preset.unit,
    };
    if (preset.code === "bp") {
      body.systolic = Number(systolic);
      body.diastolic = Number(diastolic);
    } else {
      body.value = Number(value);
    }
    const res = await fetch(`/api/members/${memberId}/measurements`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setBusy(false);
    if (res.ok) {
      setValue("");
      setSystolic("");
      setDiastolic("");
      router.refresh();
    }
  }

  return (
    <div className="card p-4 space-y-3">
      <h3 className="font-medium text-sm">Быстрый ввод показателя</h3>
      <div className="flex flex-wrap gap-1.5">
        {VITAL_PRESETS.map((p) => (
          <button
            key={p.code}
            onClick={() => setPreset(p)}
            className={`px-2.5 py-1 rounded-lg text-xs border transition-colors ${
              preset.code === p.code
                ? "bg-[var(--accent)] text-white border-[var(--accent)]"
                : "bg-surface text-muted hover:text-foreground"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>
      <form onSubmit={submit} className="flex items-end gap-2">
        {preset.code === "bp" ? (
          <>
            <div className="w-24">
              <label className="label">Систол.</label>
              <input className="input" type="number" value={systolic} onChange={(e) => setSystolic(e.target.value)} required />
            </div>
            <span className="pb-2 text-muted">/</span>
            <div className="w-24">
              <label className="label">Диастол.</label>
              <input className="input" type="number" value={diastolic} onChange={(e) => setDiastolic(e.target.value)} required />
            </div>
          </>
        ) : (
          <div className="w-40">
            <label className="label">
              {preset.label}, {preset.unit}
            </label>
            <input className="input" type="number" step="any" value={value} onChange={(e) => setValue(e.target.value)} required />
          </div>
        )}
        <button className="btn btn-primary" disabled={busy}>
          Добавить
        </button>
      </form>
    </div>
  );
}
