"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";

interface Vac {
  id: string;
  name: string;
  date: string;
  dose: string | null;
  note: string | null;
}

export default function VaccinationsSection({ memberId, vaccinations }: { memberId: string; vaccinations: Vac[] }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [date, setDate] = useState("");
  const [dose, setDose] = useState("");
  const [busy, setBusy] = useState(false);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!name || !date) return;
    setBusy(true);
    const res = await fetch(`/api/members/${memberId}/vaccinations`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, date, dose }),
    });
    setBusy(false);
    if (res.ok) {
      setName("");
      setDate("");
      setDose("");
      router.refresh();
    }
  }
  async function remove(id: string) {
    await fetch(`/api/vaccinations/${id}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <section className="space-y-3">
      <h2 className="text-sm font-semibold text-muted uppercase tracking-wide">Прививки</h2>
      <form onSubmit={add} className="card p-4 flex flex-col sm:flex-row gap-2 sm:items-end">
        <div className="flex-1">
          <label className="label">Вакцина</label>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="АКДС / Корь / Грипп" />
        </div>
        <div className="sm:w-40">
          <label className="label">Дата</label>
          <input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div className="sm:w-28">
          <label className="label">Доза</label>
          <input className="input" value={dose} onChange={(e) => setDose(e.target.value)} placeholder="V1 / R2" />
        </div>
        <button className="btn btn-primary" disabled={busy}>
          Добавить
        </button>
      </form>

      {vaccinations.length > 0 && (
        <div className="card divide-y">
          {vaccinations.map((v) => (
            <div key={v.id} className="p-3 flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-medium">
                  {v.name}
                  {v.dose ? <span className="text-muted font-normal"> · {v.dose}</span> : ""}
                </div>
                <div className="text-xs text-muted">{format(new Date(v.date), "dd.MM.yyyy")}</div>
              </div>
              <button className="text-muted hover:text-[var(--bad)] shrink-0" onClick={() => remove(v.id)}>
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
