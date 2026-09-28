"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function GenerateInsightButton({ memberId }: { memberId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function generate() {
    setBusy(true);
    setErr("");
    const res = await fetch(`/api/members/${memberId}/insights/generate`, { method: "POST" });
    setBusy(false);
    if (res.ok) {
      router.refresh();
    } else {
      const d = await res.json().catch(() => ({}));
      setErr(d.error || "Ошибка");
    }
  }

  return (
    <div className="flex items-center gap-3">
      <button className="btn btn-primary" onClick={generate} disabled={busy}>
        {busy ? "Claude анализирует…" : "Сгенерировать сводку"}
      </button>
      {err && <span className="text-sm text-[var(--bad)]">{err}</span>}
    </div>
  );
}

export function DeleteInsightButton({ id }: { id: string }) {
  const router = useRouter();
  async function remove() {
    if (!confirm("Удалить сводку?")) return;
    await fetch(`/api/insights/${id}`, { method: "DELETE" });
    router.refresh();
  }
  return (
    <button className="text-muted hover:text-[var(--bad)] text-sm shrink-0" onClick={remove}>
      ✕
    </button>
  );
}
