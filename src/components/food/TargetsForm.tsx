"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function TargetsForm({
  memberId,
  kcalTarget,
  proteinTarget,
}: {
  memberId: string;
  kcalTarget: number | null;
  proteinTarget: number | null;
}) {
  const router = useRouter();
  const [kcal, setKcal] = useState(kcalTarget?.toString() ?? "");
  const [protein, setProtein] = useState(proteinTarget?.toString() ?? "");
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setSaved(false);
    const res = await fetch(`/api/members/${memberId}/food`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        kcalTarget: kcal.trim() === "" ? null : Number(kcal),
        proteinTarget: protein.trim() === "" ? null : Number(protein),
      }),
    });
    setBusy(false);
    if (res.ok) {
      setSaved(true);
      router.refresh();
    }
  }

  return (
    <form onSubmit={save} className="card p-4 space-y-3">
      <h3 className="font-medium text-sm">Дневные цели</h3>
      <div className="grid grid-cols-2 gap-2">
        <label className="text-xs text-muted space-y-1">
          <span>Калории</span>
          <input className="input" inputMode="numeric" value={kcal} onChange={(e) => setKcal(e.target.value)} />
        </label>
        <label className="text-xs text-muted space-y-1">
          <span>Белок, г</span>
          <input className="input" inputMode="numeric" value={protein} onChange={(e) => setProtein(e.target.value)} />
        </label>
      </div>
      <button className="btn btn-primary" disabled={busy}>
        {busy ? "Сохраняю…" : saved ? "Сохранено" : "Сохранить цели"}
      </button>
    </form>
  );
}
