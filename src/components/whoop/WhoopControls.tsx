"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";

export default function WhoopControls({
  memberId,
  connected,
  configured,
  lastSync,
}: {
  memberId: string;
  connected: boolean;
  configured: boolean;
  lastSync: string | null;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  async function sync() {
    setBusy(true);
    setMsg("Синхронизация…");
    const res = await fetch(`/api/members/${memberId}/whoop/sync`, { method: "POST" });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    setMsg(res.ok ? `Готово: обновлено дней — ${data.days ?? 0}` : `Ошибка: ${data.error || res.status}`);
    router.refresh();
  }
  async function disconnect() {
    if (!confirm("Отключить Whoop для этого члена семьи?")) return;
    setBusy(true);
    await fetch(`/api/members/${memberId}/whoop/disconnect`, { method: "POST" });
    setBusy(false);
    router.refresh();
  }

  if (!configured) {
    return (
      <div className="card p-4">
        <p className="text-sm">
          Интеграция Whoop не настроена. Зарегистрируйте приложение на{" "}
          <a href="https://developer.whoop.com" className="text-[var(--accent)]" target="_blank" rel="noreferrer">
            developer.whoop.com
          </a>{" "}
          и задайте <code>WHOOP_CLIENT_ID</code>, <code>WHOOP_CLIENT_SECRET</code> в <code>.env</code>.
        </p>
        <p className="text-xs text-muted mt-2">
          Redirect URL приложения: <code>http://localhost:3000/api/whoop/callback</code>
        </p>
      </div>
    );
  }

  if (!connected) {
    return (
      <div className="card p-4 flex items-center justify-between gap-3">
        <div>
          <div className="font-medium text-sm">Whoop не подключён</div>
          <div className="text-xs text-muted">Recovery, сон, нагрузка, HRV — автоматически</div>
        </div>
        <a className="btn btn-primary" href={`/api/whoop/authorize?memberId=${memberId}`}>
          Подключить Whoop
        </a>
      </div>
    );
  }

  return (
    <div className="card p-4 flex items-center justify-between gap-3 flex-wrap">
      <div>
        <div className="font-medium text-sm flex items-center gap-2">
          <span className="pill pill-ok">Подключено</span> Whoop
        </div>
        <div className="text-xs text-muted mt-1">
          {lastSync ? `Последние данные: ${format(new Date(lastSync), "dd.MM.yyyy")}` : "Данных пока нет"}
          {msg ? ` · ${msg}` : ""}
        </div>
      </div>
      <div className="flex gap-2">
        <button className="btn btn-primary" onClick={sync} disabled={busy}>
          Синхронизировать
        </button>
        <button className="btn btn-ghost" onClick={disconnect} disabled={busy}>
          Отключить
        </button>
      </div>
    </div>
  );
}
