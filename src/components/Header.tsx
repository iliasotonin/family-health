"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

export default function Header() {
  const router = useRouter();
  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  }
  return (
    <header className="border-b bg-surface sticky top-0 z-20">
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <span className="text-xl">🩺</span>
          <span>Семейное здоровье</span>
        </Link>
        <button onClick={logout} className="text-sm text-muted hover:text-foreground">
          Выйти
        </button>
      </div>
    </header>
  );
}
