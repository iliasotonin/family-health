"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { DOCUMENT_KINDS } from "@/lib/domain";

export default function DocumentUpload({ memberId }: { memberId: string }) {
  const router = useRouter();
  const [kind, setKind] = useState("lab_panel");
  const [status, setStatus] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setBusy(true);
    for (const file of Array.from(files)) {
      setStatus(`Загрузка «${file.name}»…`);
      const fd = new FormData();
      fd.append("file", file);
      fd.append("kind", kind);
      const up = await fetch(`/api/members/${memberId}/documents`, { method: "POST", body: fd });
      if (!up.ok) {
        const e = await up.json().catch(() => ({}));
        setStatus(`Ошибка загрузки: ${e.error || up.status}`);
        continue;
      }
      const doc = await up.json();
      setStatus(`Распознавание «${file.name}» через Claude…`);
      const pr = await fetch(`/api/documents/${doc.id}/parse`, { method: "POST" });
      const pd = await pr.json().catch(() => ({}));
      if (!pr.ok) {
        setStatus(`Файл загружен, но распознать не удалось: ${pd.error || pr.status}`);
      } else {
        const n = pd.measurements ?? pd.variants ?? 0;
        setStatus(`Готово: «${file.name}» — извлечено ${n} записей.`);
      }
      router.refresh();
    }
    setBusy(false);
    if (fileRef.current) fileRef.current.value = "";
  }

  return (
    <div className="card p-4 space-y-3">
      <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
        <div className="sm:w-56">
          <label className="label">Тип документа</label>
          <select className="select" value={kind} onChange={(e) => setKind(e.target.value)} disabled={busy}>
            {DOCUMENT_KINDS.map((k) => (
              <option key={k.value} value={k.value}>{k.label}</option>
            ))}
          </select>
        </div>
        <div className="flex-1">
          <label className="label">Файл (PDF, фото, CSV)</label>
          <input
            ref={fileRef}
            type="file"
            multiple
            accept=".pdf,.png,.jpg,.jpeg,.webp,.csv,.txt"
            className="input"
            disabled={busy}
            onChange={(e) => handleFiles(e.target.files)}
          />
        </div>
      </div>
      {status && <p className="text-sm text-muted">{status}</p>}
      <p className="text-xs text-muted">
        Загрузите PDF анализов или генетический тест Genotek — Claude извлечёт показатели автоматически.
      </p>
    </div>
  );
}
