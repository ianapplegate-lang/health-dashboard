"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/", label: "Overview", emoji: "🏠" },
  { href: "/body", label: "Body", emoji: "⚖️" },
  { href: "/fitness", label: "Fitness", emoji: "🚴" },
  { href: "/sleep", label: "Sleep", emoji: "😴" },
  { href: "/hrv", label: "HRV & HR", emoji: "❤️" },
  { href: "/clinical", label: "Clinical", emoji: "🩺" },
  { href: "/timeline", label: "Timeline", emoji: "🗓️" },
  { href: "/training", label: "Training", emoji: "💪" },
];

export function TabNav() {
  const p = usePathname();
  return (
    <nav className="flex gap-1 overflow-x-auto rounded-2xl bg-zinc-900 ring-1 ring-zinc-800 p-1 -mx-1">
      {TABS.map((t) => {
        const active = t.href === "/" ? p === "/" : p.startsWith(t.href);
        return (
          <Link
            key={t.href}
            href={t.href}
            className={`whitespace-nowrap rounded-xl px-3 py-1.5 text-sm font-medium transition ${
              active
                ? "bg-emerald-500 text-black"
                : "text-zinc-300 hover:bg-zinc-800"
            }`}
          >
            <span className="mr-1.5">{t.emoji}</span>
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
