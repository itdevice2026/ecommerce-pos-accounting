"use client";

import { useEffect, useState } from "react";
import { Card, FormError, Skeleton } from "@/components/ui";
import type { Tables } from "@/lib/database.types";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase/client";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

type DashboardData = {
  company: Pick<Tables<"pos_companies">, "name" | "tin" | "vat_registered"> | null;
  branches: Pick<Tables<"pos_branches">, "id" | "code" | "name" | "type" | "is_active">[];
  accountCount: number;
  taxCodeCount: number;
  periods: Pick<Tables<"pos_fiscal_periods">, "year" | "month" | "status">[];
};

export default function AdminDashboardPage() {
  const { user } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.companyId) return;
    const sb = supabase();
    Promise.all([
      sb.from("pos_companies").select("name, tin, vat_registered").eq("id", user.companyId).maybeSingle(),
      sb.from("pos_branches").select("id, code, name, type, is_active").order("code"),
      sb.from("pos_accounts").select("id", { count: "exact", head: true }),
      sb.from("pos_tax_codes").select("id", { count: "exact", head: true }).eq("is_active", true),
      sb.from("pos_fiscal_periods").select("year, month, status").order("year").order("month"),
    ]).then(([company, branches, accounts, taxCodes, periods]) => {
      const firstError = [company, branches, accounts, taxCodes, periods].find((r) => r.error)?.error;
      if (firstError) setError(`Couldn't load the dashboard: ${firstError.message}`);
      setData({
        company: company.data ?? null,
        branches: branches.data ?? [],
        accountCount: accounts.count ?? 0,
        taxCodeCount: taxCodes.count ?? 0,
        periods: periods.data ?? [],
      });
    });
  }, [user?.companyId]);

  const openPeriods = (data?.periods ?? []).filter((p) => p.status === "open");
  const firstOpen = openPeriods[0];

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
      {!data ? (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
      ) : (
        <>
          <p className="mt-1 text-sm text-muted">
            {data.company?.name ?? "Your company"}
            {data.company?.tin ? ` · TIN ${data.company.tin}` : ""}
            {data.company ? ` · ${data.company.vat_registered ? "VAT-registered" : "Non-VAT"}` : ""}
          </p>
          <div className="mt-4">
            <FormError message={error} />
          </div>

          <div className="mt-2 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Stat label="Branches" value={data.branches.length} />
            <Stat label="Chart of accounts" value={data.accountCount} suffix="accounts" />
            <Stat label="Tax codes" value={data.taxCodeCount} />
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
                  {data.branches.map((b) => (
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
                <Progress done label="Products, variants and prices" />
                <Progress done label="Inventory: stock, lots, transfers, adjustments" />
                <Progress label="Purchasing (Phase 1)" />
                <Progress label="Accounting screens (Phase 2)" />
                <Progress label="POS (Phase 3)" />
                <Progress label="Online store (Phase 4)" />
              </ul>
            </Card>
          </div>
        </>
      )}
    </div>
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
