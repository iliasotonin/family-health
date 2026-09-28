"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";

interface Entry {
  id: string;
  date: string;
  mood: number | null;
  symptoms: string | null;
  note: string | null;
}

const MOODS = ["😞", "🙁", "😐", "🙂", "😀"];

export default function DiarySection({ memberId, entries }: { memberId: string; entries: Entry[] }) {
  const router = useRouter();
  const [symptoms, setSymptoms] = useState("");
  const [note, setNote] = useState("");
  const [mood, setMood] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!symptoms && !note && mood == null) return;
    setBusy(true);
    const res = await fetch(`/api/members/${memberId}/diary`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ symptoms, note, mood }),
    });
    setBusy(false);
    if (res.ok) {
      setSymptoms("");
      setNote("");
      setMood(null);
      router.refresh();
    }
  }
  async function remove(id: string) {
    await fetch(`/api/diary/${id}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <section className="space-y-3">
      <h2 className="text-sm font-semibold text-muted uppercase tracking-wide">Дневник самочувствия</h2>
      <form onSubmit={add} className="card p-4 space-y-3">
        <div className="flex gap-1.5">
          {MOODS.map((m, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setMood(mood === i + 1 ? null : i + 1)}
              className={`text-xl w-10 h-10 rounded-lg border transition-colors ${
                mood === i + 1 ? "border-[var(--accent)] bg-[var(--accent-weak)]" : "border-[var(--border)]"
              }`}
            >
              {m}
            </button>
          ))}
        </div>
        <input
          className="input"
          placeholder="Симптомы (напр. головная боль, температура)"
          value={symptoms}
          onChange={(e) => setSymptoms(e.target.value)}
        />
        <textarea
          className="textarea"
          rows={2}
          placeholder="Заметка"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
        <button className="btn btn-primary" disabled={busy}>
          Записать
        </button>
      </form>

      {entries.length > 0 && (
        <div className="card divide-y">
          {entries.map((en) => (
            <div key={en.id} className="p-3 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-xs text-muted mb-0.5">
                  {format(new Date(en.date), "dd.MM.yyyy HH:mm")}
                  {en.mood ? ` · ${MOODS[en.mood - 1]}` : ""}
                </div>
                {en.symptoms && <div className="text-sm">{en.symptoms}</div>}
                {en.note && <div className="text-sm text-muted whitespace-pre-wrap">{en.note}</div>}
              </div>
              <button className="text-muted hover:text-[var(--bad)] text-sm shrink-0" onClick={() => remove(en.id)}>
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
