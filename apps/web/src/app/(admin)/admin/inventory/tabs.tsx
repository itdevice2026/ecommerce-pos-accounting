"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { href: "/admin/inventory/", label: "Stock on hand" },
  { href: "/admin/inventory/documents/", label: "Documents" },
  { href: "/admin/inventory/movements/", label: "Movements" },
  { href: "/admin/inventory/locations/", label: "Locations" },
];

export function InventoryTabs() {
  const pathname = usePathname().replace(/\/?$/, "/");
  const current = (href: string) =>
    href === "/admin/inventory/" ? pathname === href : pathname.startsWith(href) || (href.includes("documents") && pathname.includes("/inventory/doc/"));

  return (
    <nav className="mt-4 flex gap-1 overflow-x-auto border-b border-line" aria-label="Inventory">
      {tabs.map((t) => (
        <Link
          key={t.href}
          href={t.href}
          aria-current={current(t.href) ? "page" : undefined}
          className={`-mb-px border-b-2 px-3 py-2 text-sm font-medium whitespace-nowrap ${
            current(t.href) ? "border-brand text-ink" : "border-transparent text-muted hover:text-ink"
          }`}
        >
          {t.label}
        </Link>
      ))}
    </nav>
  );
}

export function InventoryHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: React.ReactNode }) {
  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          {subtitle ? <p className="mt-1 text-sm text-muted">{subtitle}</p> : null}
        </div>
        {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
      </div>
      <InventoryTabs />
    </>
  );
}
