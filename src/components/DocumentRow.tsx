"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { labelFor, DOCUMENT_KINDS } from "@/lib/domain";
import { format } from "date-fns";

interface DocData {
  id: string;
  kind: string;
  fileName: string;
  status: string;
  parseError: string | null;
  summary: string | null;
  sourceLab: string | null;
  collectedDate: string | Date | null;
  createdAt: string | Date;
  measurementCount: number;
  variantCount: number;
}

export default function DocumentRow({ doc }: { doc: DocData }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function reparse() {
    setBusy(true);
    await fetch(`/api/documents/${doc.id}/parse`, { method: "POST" });
    setBusy(false);
    router.refresh();
  }
  async function remove() {
    if (!confirm(`Удалить «${doc.fileName}» и все извлечённые из него данные?`)) return;
    setBusy(true);
    await fetch(`/api/documents/${doc.id}`, { method: "DELETE" });
    setBusy(false);
    router.refresh();
  }

  const statusPill =
    doc.status === "parsed"
      ? "pill pill-ok"
      : doc.status === "failed"
      ? "pill pill-bad"
      : doc.status === "parsing"
      ? "pill pill-warn"
      : "pill pill-muted";
  const statusText =
    doc.status === "parsed"
      ? "Распознано"
      : doc.status === "failed"
      ? "Ошибка"
      : doc.status === "parsing"
      ? "Обработка…"
      : "Загружено";

  const date = doc.collectedDate || doc.createdAt;
  const count = doc.kind === "genetic" ? doc.variantCount : doc.measurementCount;

  return (
    <div className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-sm truncate">{doc.fileName}</span>
            <span className={statusPill}>{statusText}</span>
          </div>
          <div className="text-xs text-muted mt-0.5">
            {labelFor(DOCUMENT_KINDS, doc.kind)} · {format(new Date(date), "dd.MM.yyyy")}
            {doc.sourceLab ? ` · ${doc.sourceLab}` : ""}
            {doc.status === "parsed" ? ` · ${count} записей` : ""}
          </div>
          {doc.summary && <p className="text-sm text-muted mt-2">{doc.summary}</p>}
          {doc.parseError && <p className="text-sm text-[var(--bad)] mt-2">{doc.parseError}</p>}
        </div>
        <div className="flex gap-2 shrink-0">
          <button className="btn btn-ghost" onClick={reparse} disabled={busy} title="Распознать заново">
            ↻
          </button>
          <button className="btn btn-ghost" onClick={remove} disabled={busy} title="Удалить">
            🗑
          </button>
        </div>
      </div>
    </div>
  );
}
