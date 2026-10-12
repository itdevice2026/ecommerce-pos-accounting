"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Badge, Card, FormError, Input, Select, Skeleton } from "@/components/ui";
import { useAuth } from "@/lib/auth";
import { formatPeso } from "@/lib/catalog";
import { addDaysIso, canEditDoc, formatDate, formatQty, locationLabel, todayIso, useBranchesAndLocations } from "@/lib/inventory";
import { supabase } from "@/lib/supabase/client";
import { InventoryHeader } from "./tabs";

type Row = {
  product_id: string;
  sku: string;
  name: string;
  base_uom: string;
  reorder_point: number | null;
  on_hand: number;
  in_transit: number;
  avg_cost: number;
};

type ExpiringLot = {
  qty: number;
  location_id: string;
  product: { name: string; base_uom: string } | null;
  lot: { lot_no: string; expiry_date: string | null } | null;
};

export default function StockOnHandPage() {
  const { user } = useAuth();
  const { branches, locations } = useBranchesAndLocations();
  const storage = useMemo(() => locations.filter((l) => l.type === "storage"), [locations]);

  const [locationId, setLocationId] = useState("");
  const [query, setQuery] = useState("");
  const [lowOnly, setLowOnly] = useState(false);
  const [hideZero, setHideZero] = useState(false);
  const [rows, setRows] = useState<Row[] | null>(null);
  const [expiring, setExpiring] = useState<ExpiringLot[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const sb = supabase();
    (async () => {
      const { data: summary, error: err } = await sb
        .from("pos_stock_summary")
        .select("product_id, sku, name, base_uom, reorder_point, qty_on_hand, qty_in_transit, avg_cost, is_active")
        .eq("is_active", true)
        .order("name");
      if (!active) return;
      if (err) {
        setError(`Couldn't load stock: ${err.message}`);
        setRows([]);
        return;
      }
      let perLocation: Map<string, number> | null = null;
      if (locationId) {
        const { data: bal } = await sb.from("pos_stock_balances").select("product_id, qty").eq("location_id", locationId);
        if (!active) return;
        perLocation = new Map();
        for (const b of bal ?? []) perLocation.set(b.product_id, (perLocation.get(b.product_id) ?? 0) + b.qty);
      }
      setError(null);
      setRows(
        (summary ?? []).map((s) => ({
          product_id: s.product_id!,
          sku: s.sku!,
          name: s.name!,
          base_uom: s.base_uom!,
          reorder_point: s.reorder_point,
          on_hand: perLocation ? (perLocation.get(s.product_id!) ?? 0) : (s.qty_on_hand ?? 0),
          in_transit: perLocation ? 0 : (s.qty_in_transit ?? 0),
          avg_cost: s.avg_cost ?? 0,
        })),
      );
    })();
    return () => {
      active = false;
    };
  }, [locationId]);

  useEffect(() => {
    let q = supabase()
      .from("pos_stock_balances")
      .select("qty, location_id, product:pos_products(name, base_uom), lot:pos_lots!inner(lot_no, expiry_date)")
      .gt("qty", 0)
      .not("lot_id", "is", null)
      .lte("lot.expiry_date", addDaysIso(30));
    if (locationId) q = q.eq("location_id", locationId);
    q.then(({ data }) =>
      setExpiring(
        ((data ?? []) as unknown as ExpiringLot[])
          .filter((r) => r.lot?.expiry_date)
          .sort((a, b) => a.lot!.expiry_date!.localeCompare(b.lot!.expiry_date!)),
      ),
    );
  }, [locationId]);

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    return (rows ?? []).filter(
      (r) =>
        (!term || r.name.toLowerCase().includes(term) || r.sku.toLowerCase().includes(term)) &&
        (!lowOnly || (r.reorder_point != null && r.on_hand <= r.reorder_point)) &&
        (!hideZero || r.on_hand !== 0 || r.in_transit !== 0),
    );
  }, [rows, query, lowOnly, hideZero]);

  const totalValue = filtered.reduce((sum, r) => sum + r.on_hand * r.avg_cost, 0);
  const lowCount = (rows ?? []).filter((r) => r.reorder_point != null && r.on_hand <= r.reorder_point).length;
  const today = todayIso();
  const canCreate = !!user && (canEditDoc(user, "receipt", user.branchIds[0]) || canEditDoc(user, "opening", null));

  return (
    <div className="mx-auto max-w-6xl">
      <InventoryHeader
        title="Inventory"
        subtitle="Stock on hand per product, valued at moving average cost."
        actions={
          canCreate ? (
            <>
              <Link href="/admin/inventory/doc/?type=receipt" className="inline-flex h-10 items-center rounded-lg bg-brand px-4 text-sm font-medium text-white hover:bg-brand-strong">
                Stock in
              </Link>
              <Link href="/admin/inventory/doc/?type=adjustment" className="inline-flex h-10 items-center rounded-lg border border-line bg-surface px-4 text-sm font-medium hover:bg-surface-2">
                Adjust
              </Link>
              <Link href="/admin/inventory/doc/?type=transfer" className="inline-flex h-10 items-center rounded-lg border border-line bg-surface px-4 text-sm font-medium hover:bg-surface-2">
                Transfer
              </Link>
            </>
          ) : null
        }
      />

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <Card>
          <p className="text-xs font-medium text-muted">Stock value{locationId ? " (this location)" : ""}</p>
          <p className="mt-2 text-2xl font-semibold tabular-nums">{rows ? formatPeso(totalValue) : "…"}</p>
        </Card>
        <Card>
          <p className="text-xs font-medium text-muted">At or below reorder point</p>
          <p className={`mt-2 text-2xl font-semibold tabular-nums ${lowCount > 0 ? "text-brand" : ""}`}>{rows ? lowCount : "…"}</p>
        </Card>
        <Card>
          <p className="text-xs font-medium text-muted">Lots expiring within 30 days</p>
          <p className={`mt-2 text-2xl font-semibold tabular-nums ${expiring.length > 0 ? "text-brand" : ""}`}>{expiring.length}</p>
        </Card>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <Input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search name or SKU" aria-label="Search" className="w-full sm:w-64" />
        <Select value={locationId} onChange={(e) => setLocationId(e.target.value)} aria-label="Location">
          <option value="">All locations</option>
          {storage.map((l) => (
            <option key={l.id} value={l.id}>
              {locationLabel(l, branches)}
            </option>
          ))}
        </Select>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={lowOnly} onChange={(e) => setLowOnly(e.target.checked)} className="size-4 accent-[var(--brand)]" />
          Low stock only
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={hideZero} onChange={(e) => setHideZero(e.target.checked)} className="size-4 accent-[var(--brand)]" />
          Hide zero stock
        </label>
      </div>

      <div className="mt-3">
        <FormError message={error} />
      </div>

      <Card className="mt-2 overflow-x-auto p-0">
        {rows === null ? (
          <div className="p-5">
            <Skeleton className="h-48" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="px-6 py-14 text-center">
            <p className="font-medium">{rows.length === 0 ? "No stock-tracked products yet." : "Nothing matches."}</p>
            <p className="mt-1 text-sm text-muted">
              {rows.length === 0 ? (
                <>
                  Add products first, then record your{" "}
                  <Link href="/admin/inventory/doc/?type=opening" className="text-brand">
                    opening stock
                  </Link>
                  .
                </>
              ) : (
                "Try a different search or filter."
              )}
            </p>
          </div>
        ) : (
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="border-b border-line text-xs text-muted">
              <tr>
                <th className="px-4 py-3 font-medium">SKU</th>
                <th className="px-4 py-3 font-medium">Product</th>
                <th className="px-4 py-3 text-right font-medium">On hand</th>
                {!locationId ? <th className="px-4 py-3 text-right font-medium">In transit</th> : null}
                <th className="px-4 py-3 text-right font-medium">Reorder at</th>
                <th className="px-4 py-3 text-right font-medium">Avg cost</th>
                <th className="px-4 py-3 text-right font-medium">Value</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {filtered.map((r) => {
                const low = r.reorder_point != null && r.on_hand <= r.reorder_point;
                return (
                  <tr key={r.product_id} className="hover:bg-surface-2/50">
                    <td className="px-4 py-3 font-mono text-xs">{r.sku}</td>
                    <td className="px-4 py-3">
                      <Link href={`/admin/inventory/movements/?product=${r.product_id}`} className="font-medium hover:text-brand">
                        {r.name}
                      </Link>
                      {low ? <span className="ml-2"><Badge tone="neutral">Low</Badge></span> : null}
                    </td>
                    <td className={`px-4 py-3 text-right tabular-nums ${low ? "font-semibold text-brand" : ""}`}>
                      {formatQty(r.on_hand)} <span className="text-muted">{r.base_uom}</span>
                    </td>
                    {!locationId ? <td className="px-4 py-3 text-right tabular-nums text-muted">{r.in_transit ? formatQty(r.in_transit) : "—"}</td> : null}
                    <td className="px-4 py-3 text-right tabular-nums text-muted">{r.reorder_point != null ? formatQty(r.reorder_point) : "—"}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{formatPeso(r.avg_cost)}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{formatPeso(r.on_hand * r.avg_cost)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </Card>

      {expiring.length > 0 ? (
        <Card className="mt-6 overflow-x-auto p-0">
          <h2 className="px-4 pt-4 text-sm font-semibold">Expiring within 30 days</h2>
          <table className="mt-2 w-full min-w-[560px] text-left text-sm">
            <thead className="border-b border-line text-xs text-muted">
              <tr>
                <th className="px-4 py-2 font-medium">Product</th>
                <th className="px-4 py-2 font-medium">Lot</th>
                <th className="px-4 py-2 font-medium">Location</th>
                <th className="px-4 py-2 font-medium">Expiry</th>
                <th className="px-4 py-2 text-right font-medium">Qty</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {expiring.map((e, i) => {
                const expired = !!e.lot?.expiry_date && e.lot.expiry_date < today;
                return (
                  <tr key={i}>
                    <td className="px-4 py-2">{e.product?.name}</td>
                    <td className="px-4 py-2 font-mono text-xs">{e.lot?.lot_no}</td>
                    <td className="px-4 py-2 text-muted">{locationLabel(locations.find((l) => l.id === e.location_id), branches)}</td>
                    <td className={`px-4 py-2 ${expired ? "font-semibold text-brand" : ""}`}>
                      {formatDate(e.lot?.expiry_date)}
                      {expired ? " · expired" : ""}
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums">
                      {formatQty(e.qty)} <span className="text-muted">{e.product?.base_uom}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      ) : null}
    </div>
  );
}
