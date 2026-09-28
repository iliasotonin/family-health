"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MEMBER_ROLES, SEX_OPTIONS } from "@/lib/domain";

export default function AddMemberForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [role, setRole] = useState("self");
  const [sex, setSex] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const res = await fetch("/api/members", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, role, sex: sex || null, birthDate: birthDate || null }),
    });
    setLoading(false);
    if (res.ok) {
      setName("");
      setSex("");
      setBirthDate("");
      setOpen(false);
      router.refresh();
    }
  }

  if (!open) {
    return (
      <button className="btn btn-ghost" onClick={() => setOpen(true)}>
        + Добавить члена семьи
      </button>
    );
  }

  return (
    <form onSubmit={submit} className="card p-4 space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="label">Имя</label>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} autoFocus required />
        </div>
        <div>
          <label className="label">Роль</label>
          <select className="select" value={role} onChange={(e) => setRole(e.target.value)}>
            {MEMBER_ROLES.map((r) => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Пол</label>
          <select className="select" value={sex} onChange={(e) => setSex(e.target.value)}>
            <option value="">—</option>
            {SEX_OPTIONS.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Дата рождения</label>
          <input type="date" className="input" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} />
        </div>
      </div>
      <div className="flex gap-2">
        <button className="btn btn-primary" disabled={loading || !name}>
          {loading ? "Сохранение…" : "Сохранить"}
        </button>
        <button type="button" className="btn btn-ghost" onClick={() => setOpen(false)}>
          Отмена
        </button>
      </div>
    </form>
  );
}
