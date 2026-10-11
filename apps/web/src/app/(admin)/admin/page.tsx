import type { Metadata } from "next";
import { Suspense } from "react";
import { Card, Skeleton } from "@/components/ui";
import { BACK_OFFICE_ROLES, requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Dashboard" };

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export default function AdminDashboardPage() {
  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
      <Suspense fallback={<DashboardSkeleton />}>
        <Dashboard />
      </Suspense>
    </div>
  );
}

async function Dashboard() {
  const user = await requireRole(BACK_OFFICE_ROLES, "/admin");
  const supabase = await createClient();

  const [company, branches, accounts, taxCodes, periods] = await Promise.all([
    supabase.from("pos_companies").select("name, tin, vat_registered").eq("id", user.companyId!).maybeSingle(),
    supabase.from("pos_branches").select("id, code, name, type, is_active").order("code"),
    supabase.from("pos_accounts").select("id", { count: "exact", head: true }),
    supabase.from("pos_tax_codes").select("code, name").eq("is_active", true).order("code"),
    supabase.from("pos_fiscal_periods").select("year, month, status").order("year").order("month"),
  ]);

  const openPeriods = (periods.data ?? []).filter((p) => p.status === "open");
  const firstOpen = openPeriods[0];

  return (
    <>
      <p className="mt-1 text-sm text-muted">
        {company.data?.name ?? "Your company"}
        {company.data?.tin ? ` · TIN ${company.data.tin}` : ""}
        {company.data ? ` · ${company.data.vat_registered ? "VAT-registered" : "Non-VAT"}` : ""}
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Branches" value={branches.data?.length ?? 0} />
        <Stat label="Chart of accounts" value={accounts.count ?? 0} suffix="accounts" />
        <Stat label="Tax codes" value={taxCodes.data?.length ?? 0} />
        <Stat
          label="Open periods"
          value={openPeriods.length}
          suffix={firstOpen ? `from ${MONTHS[firstOpen.month - 1]} ${firstOpen.year}` : undefined}
        />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_20rem]">
        <Card>
          <h2 className="text-sm font-semibold">Branches</h2>
          <table className="mt-3 w-full text-left text-sm">
            <thead className="text-xs text-muted">
              <tr>
                <th className="py-2 font-medium">Code</th>
                <th className="py-2 font-medium">Name</th>
                <th className="py-2 font-medium">Type</th>
                <th className="py-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {(branches.data ?? []).map((b) => (
                <tr key={b.id}>
                  <td className="py-2 font-mono text-xs">{b.code}</td>
                  <td className="py-2">{b.name}</td>
                  <td className="py-2 capitalize text-muted">{b.type.replace("_", " ")}</td>
                  <td className="py-2">
                    <span className={b.is_active ? "text-ok" : "text-muted"}>{b.is_active ? "Active" : "Inactive"}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>

        <Card>
          <h2 className="text-sm font-semibold">Build progress</h2>
          <ul className="mt-3 flex flex-col gap-2 text-sm">
            <Progress done label="Database, roles and RLS" />
            <Progress done label="Chart of accounts and journals" />
            <Progress done label="Sign-in and company setup" />
            <Progress label="Users & roles screen" />
            <Progress label="Products and inventory (Phase 1)" />
            <Progress label="Accounting screens (Phase 2)" />
            <Progress label="POS (Phase 3)" />
            <Progress label="Online store (Phase 4)" />
          </ul>
        </Card>
      </div>
    </>
  );
}

function Stat({ label, value, suffix }: { label: string; value: number; suffix?: string }) {
  return (
    <Card>
      <p className="text-xs font-medium text-muted">{label}</p>
      <p className="mt-2 text-3xl font-semibold tabular-nums">{value}</p>
      {suffix ? <p className="mt-1 text-xs text-muted">{suffix}</p> : null}
    </Card>
  );
}

function Progress({ label, done = false }: { label: string; done?: boolean }) {
  return (
    <li className="flex items-center gap-2">
      <span
        aria-hidden
        className={`flex size-4 items-center justify-center rounded-full text-[10px] ${done ? "bg-ok text-white" : "border border-line"}`}
      >
        {done ? "✓" : ""}
      </span>
      <span className={done ? "" : "text-muted"}>{label}</span>
    </li>
  );
}

function DashboardSkeleton() {
  return (
    <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: 4 }, (_, i) => (
        <Skeleton key={i} className="h-28" />
      ))}
    </div>
  );
}
