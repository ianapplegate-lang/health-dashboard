"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/", label: "Overview" },
  { href: "/body", label: "Body" },
  { href: "/fitness", label: "Fitness" },
  { href: "/sleep", label: "Sleep" },
  { href: "/hrv", label: "HRV & HR" },
  { href: "/clinical", label: "Clinical" },
  { href: "/timeline", label: "Timeline" },
  { href: "/training", label: "Training plan" },
];

export function DashboardTabs() {
  const p = usePathname();
  return (
    <div className="nav">
      {TABS.map((t) => {
        const active = t.href === "/" ? p === "/" : p.startsWith(t.href);
        return (
          <Link
            key={t.href}
            href={t.href}
            className={`ntab${active ? " active" : ""}`}
          >
            {t.label}
          </Link>
        );
      })}
    </div>
  );
}
