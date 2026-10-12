"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Card, FormError, Select, Skeleton } from "@/components/ui";
import { formatPeso } from "@/lib/catalog";
import { MOVE_LABEL, formatQty, locationLabel, useBranchesAndLocations, type MoveType } from "@/lib/inventory";
import { supabase } from "@/lib/supabase/client";
import { InventoryHeader } from "../tabs";

type Move = {
  id: string;
  created_at: string;
  qty: number;
  unit_cost: number;
  move_type: MoveType;
  location_id: string;
  doc_id: string | null;
  product: { name: string; sku: string; base_uom: string } | null;
  lot: { lot_no: string } | null;
};

const LIMIT = 300;

export function MovementsView() {
  const params = useSearchParams();
  const router = useRouter();
  const productId = params.get("product") ?? "";
  const { branches, locations } = useBranchesAndLocations();
  const [locationId, setLocationId] = useState("");
  const [products, setProducts] = useState<{ id: string; name: string; sku: string }[]>([]);
  const [moves, setMoves] = useState<Move[] | null>(null);
  const [docNos, setDocNos] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    supabase()
      .from("pos_products")
      .select("id, name, sku")
      .eq("track_stock", true)
      .order("name")
      .then(({ data }) => setProducts(data ?? []));
  }, []);

  useEffect(() => {
    let active = true;
    const sb = supabase();
    let q = sb
      .from("pos_stock_moves")
      .select("id, created_at, qty, unit_cost, move_type, location_id, doc_id, product:pos_products(name, sku, base_uom), lot:pos_lots(lot_no)")
      .order("created_at", { ascending: false })
      .limit(LIMIT);
    if (productId) q = q.eq("product_id", productId);
    if (locationId) q = q.eq("location_id", locationId);
    q.then(async ({ data, error: err }) => {
      if (!active) return;
      if (err) setError(`Couldn't load movements: ${err.message}`);
      const list = (data ?? []) as unknown as Move[];
      setMoves(list);
      const ids = [...new Set(list.map((m) => m.doc_id).filter(Boolean))] as string[];
      if (ids.length) {
        const { data: docs } = await sb.from("pos_stock_docs").select("id, doc_no").in("id", ids);
        if (active) setDocNos(Object.fromEntries((docs ?? []).map((d) => [d.id, d.doc_no ?? "Draft"])));
      }
    });
    return () => {
      active = false;
    };
  }, [productId, locationId]);

  const selected = products.find((p) => p.id === productId);
  const storageAndTransit = useMemo(() => locations, [locations]);

  return (
    <div className="mx-auto max-w-6xl">
      <InventoryHeader title="Inventory" subtitle="Every change to stock, newest first. Movements can't be edited or deleted." />

      <div className="mt-6 flex flex-wrap gap-3">
        <Select
          value={productId}
          onChange={(e) => router.replace(e.target.value ? `/admin/inventory/movements/?product=${e.target.value}` : "/admin/inventory/movements/")}
          aria-label="Product"
          className="max-w-xs"
        >
          <option value="">All products</option>
          {products.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} ({p.sku})
            </option>
          ))}
        </Select>
        <Select value={locationId} onChange={(e) => setLocationId(e.target.value)} aria-label="Location">
          <option value="">All locations</option>
          {storageAndTransit.map((l) => (
            <option key={l.id} value={l.id}>
              {locationLabel(l, branches)}
            </option>
          ))}
        </Select>
      </div>

      <div className="mt-3">
        <FormError message={error} />
      </div>

      <Card className="mt-2 overflow-x-auto p-0">
        {moves === null ? (
          <div className="p-5">
            <Skeleton className="h-48" />
          </div>
        ) : moves.length === 0 ? (
          <p className="px-6 py-14 text-center text-sm text-muted">{selected ? `No movements for ${selected.name} yet.` : "No stock movements yet."}</p>
        ) : (
          <table className="w-full min-w-[820px] text-left text-sm">
            <thead className="border-b border-line text-xs text-muted">
              <tr>
                <th className="px-4 py-3 font-medium">When</th>
                <th className="px-4 py-3 font-medium">Document</th>
                <th className="px-4 py-3 font-medium">Type</th>
                {!productId ? <th className="px-4 py-3 font-medium">Product</th> : null}
                <th className="px-4 py-3 font-medium">Location</th>
                <th className="px-4 py-3 font-medium">Lot</th>
                <th className="px-4 py-3 text-right font-medium">In</th>
                <th className="px-4 py-3 text-right font-medium">Out</th>
                <th className="px-4 py-3 text-right font-medium">Unit cost</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {moves.map((m) => (
                <tr key={m.id}>
                  <td className="px-4 py-2 whitespace-nowrap text-muted">
                    {new Date(m.created_at).toLocaleString("en-PH", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                  </td>
                  <td className="px-4 py-2">
                    {m.doc_id ? (
                      <Link href={`/admin/inventory/doc/?id=${m.doc_id}`} className="font-mono text-xs hover:text-brand">
                        {docNos[m.doc_id] ?? "…"}
                      </Link>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-4 py-2">{MOVE_LABEL[m.move_type]}</td>
                  {!productId ? <td className="px-4 py-2">{m.product?.name}</td> : null}
                  <td className="px-4 py-2 text-muted">{locationLabel(locations.find((l) => l.id === m.location_id), branches)}</td>
                  <td className="px-4 py-2 font-mono text-xs">{m.lot?.lot_no ?? "—"}</td>
                  <td className="px-4 py-2 text-right tabular-nums text-ok">{m.qty > 0 ? formatQty(m.qty) : ""}</td>
                  <td className="px-4 py-2 text-right tabular-nums text-brand">{m.qty < 0 ? formatQty(-m.qty) : ""}</td>
                  <td className="px-4 py-2 text-right tabular-nums text-muted">{formatPeso(m.unit_cost)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
      {moves && moves.length === LIMIT ? <p className="mt-2 text-xs text-muted">Showing the latest {LIMIT}. Filter by product or location to see older ones.</p> : null}
    </div>
  );
}
