"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Med {
  id: string;
  name: string;
  dose: string | null;
  schedule: string | null;
  active: boolean;
}

export default function MedsSection({ memberId, meds }: { memberId: string; meds: Med[] }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [dose, setDose] = useState("");
  const [schedule, setSchedule] = useState("");
  const [busy, setBusy] = useState(false);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!name) return;
    setBusy(true);
    const res = await fetch(`/api/members/${memberId}/medications`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, dose, schedule }),
    });
    setBusy(false);
    if (res.ok) {
      setName("");
      setDose("");
      setSchedule("");
      router.refresh();
    }
  }
  async function toggle(m: Med) {
    await fetch(`/api/medications/${m.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !m.active }),
    });
    router.refresh();
  }
  async function remove(id: string) {
    await fetch(`/api/medications/${id}`, { method: "DELETE" });
    router.refresh();
  }

  const active = meds.filter((m) => m.active);
  const inactive = meds.filter((m) => !m.active);

  return (
    <section className="space-y-3">
      <h2 className="text-sm font-semibold text-muted uppercase tracking-wide">Лекарства и добавки</h2>
      <form onSubmit={add} className="card p-4 flex flex-col sm:flex-row gap-2 sm:items-end">
        <div className="flex-1">
          <label className="label">Название</label>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Витамин D" />
        </div>
        <div className="sm:w-32">
          <label className="label">Доза</label>
          <input className="input" value={dose} onChange={(e) => setDose(e.target.value)} placeholder="2000 МЕ" />
        </div>
        <div className="sm:w-40">
          <label className="label">Приём</label>
          <input className="input" value={schedule} onChange={(e) => setSchedule(e.target.value)} placeholder="1 р/день утром" />
        </div>
        <button className="btn btn-primary" disabled={busy}>
          Добавить
        </button>
      </form>

      {(active.length > 0 || inactive.length > 0) && (
        <div className="card divide-y">
          {[...active, ...inactive].map((m) => (
            <div key={m.id} className="p-3 flex items-center justify-between gap-3">
              <div className={m.active ? "" : "opacity-50"}>
                <div className="text-sm font-medium">
                  {m.name}
                  {m.dose ? <span className="text-muted font-normal"> · {m.dose}</span> : ""}
                </div>
                {m.schedule && <div className="text-xs text-muted">{m.schedule}</div>}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button className="text-xs text-muted hover:text-foreground" onClick={() => toggle(m)}>
                  {m.active ? "Завершить" : "Возобновить"}
                </button>
                <button className="text-muted hover:text-[var(--bad)]" onClick={() => remove(m.id)}>
                  ✕
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
