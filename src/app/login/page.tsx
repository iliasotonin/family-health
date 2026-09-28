"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

// Only same-origin paths. A "from" taken from the URL as-is would turn the login page into an
// open redirect: a crafted link sends the user to another site right after they type the password.
function safeNext(raw: string | null): string {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//") || raw.startsWith("/\\")) return "/";
  return raw;
}

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    if (res.ok) {
      router.replace(safeNext(params.get("from")));
      router.refresh();
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Ошибка входа");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <form onSubmit={submit} className="card p-7 w-full max-w-sm">
        <div className="text-2xl mb-1">🩺</div>
        <h1 className="text-lg font-semibold">Семейное здоровье</h1>
        <p className="text-sm text-muted mb-5">Введите пароль доступа</p>
        <input
          type="password"
          className="input mb-3"
          placeholder="Пароль"
          value={password}
          autoFocus
          onChange={(e) => setPassword(e.target.value)}
        />
        {error && <p className="text-sm text-[var(--bad)] mb-3">{error}</p>}
        <button className="btn btn-primary w-full" disabled={loading}>
          {loading ? "Вход…" : "Войти"}
        </button>
      </form>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
