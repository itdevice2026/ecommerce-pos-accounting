"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { SignOutButton } from "@/components/sign-out-button";
import { Skeleton } from "@/components/ui";
import { BACK_OFFICE_ROLES, ROLE_LABELS, RequireRole, useAuth } from "@/lib/auth";

const nav = [
  { href: "/admin/", label: "Dashboard", ready: true },
  { href: "/admin/products/", label: "Products", ready: true },
  { href: "/admin/inventory/", label: "Inventory", ready: true },
  { href: "#", label: "Purchasing", ready: false, phase: "Phase 1" },
  { href: "#", label: "Accounting", ready: false, phase: "Phase 2" },
  { href: "#", label: "Reports", ready: false, phase: "Phase 5" },
  { href: "#", label: "Users & roles", ready: false, phase: "Phase 0" },
];

export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  const pathname = usePathname();
  const isCurrent = (href: string) =>
    href === "/admin/" ? pathname === "/admin" || pathname === "/admin/" : pathname.startsWith(href.replace(/\/$/, ""));
  return (
    <div className="flex min-h-full flex-1 flex-col md:flex-row">
      <aside className="border-b border-line bg-surface md:w-60 md:shrink-0 md:border-r md:border-b-0">
        <div className="flex items-center justify-between px-4 py-4 md:block">
          <Link href="/" className="text-sm font-semibold tracking-wide text-brand uppercase">
            POS &amp; Accounting
          </Link>
          <p className="hidden text-xs text-muted md:mt-1 md:block">Back office</p>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-2 pb-3 md:flex-col md:overflow-visible">
          {nav.map((item) =>
            item.ready ? (
              <Link
                key={item.label}
                href={item.href}
                aria-current={isCurrent(item.href) ? "page" : undefined}
                className={`rounded-lg px-3 py-2 text-sm font-medium whitespace-nowrap hover:bg-surface-2 ${isCurrent(item.href) ? "bg-surface-2 text-brand" : "text-ink"}`}
              >
                {item.label}
              </Link>
            ) : (
              <span
                key={item.label}
                className="flex items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm whitespace-nowrap text-muted/70"
                title={`Coming in ${item.phase}`}
              >
                {item.label}
                <span className="hidden text-[10px] font-medium tracking-wide uppercase md:inline">{item.phase}</span>
              </span>
            ),
          )}
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-end gap-3 border-b border-line bg-surface px-4 py-3 sm:px-6">
          <UserBadge />
          <SignOutButton className="h-8 px-3" />
        </header>
        <main className="flex-1 px-4 py-6 sm:px-6">
          <RequireRole roles={BACK_OFFICE_ROLES} fallback={<Skeleton className="mx-auto h-64 max-w-5xl" />}>
            {children}
          </RequireRole>
        </main>
      </div>
    </div>
  );
}

function UserBadge() {
  const { loading, user } = useAuth();
  if (loading) return <Skeleton className="h-5 w-40" />;
  if (!user) return null;
  return (
    <span className="truncate text-sm text-muted">
      {user.email}
      {user.role ? (
        <span className="ml-2 rounded-md bg-surface-2 px-2 py-0.5 text-xs font-medium text-ink">{ROLE_LABELS[user.role]}</span>
      ) : null}
    </span>
  );
}
