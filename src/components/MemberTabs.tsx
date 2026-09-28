"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { seg: "", label: "Обзор" },
  { seg: "labs", label: "Анализы" },
  { seg: "trends", label: "Динамика" },
  { seg: "journal", label: "Дневник" },
  { seg: "food", label: "Питание" },
  { seg: "genetics", label: "Генетика" },
  { seg: "whoop", label: "Whoop" },
  { seg: "insights", label: "Инсайты" },
];

export default function MemberTabs({ memberId }: { memberId: string }) {
  const pathname = usePathname();
  const base = `/m/${memberId}`;
  return (
    <nav className="flex gap-1 overflow-x-auto border-b -mx-1 px-1">
      {TABS.map((t) => {
        const href = t.seg ? `${base}/${t.seg}` : base;
        const active = t.seg ? pathname.startsWith(href) : pathname === base;
        return (
          <Link
            key={t.seg || "overview"}
            href={href}
            className={`px-3 py-2 text-sm whitespace-nowrap border-b-2 -mb-px transition-colors ${
              active
                ? "border-[var(--accent)] text-foreground font-medium"
                : "border-transparent text-muted hover:text-foreground"
            }`}
          >
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
