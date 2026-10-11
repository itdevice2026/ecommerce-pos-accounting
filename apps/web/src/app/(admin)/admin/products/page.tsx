"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Badge, Card, FormError, Input, Select, Skeleton } from "@/components/ui";
import { useAuth } from "@/lib/auth";
import { canEditCatalog, formatPeso, type Category } from "@/lib/catalog";
import { supabase } from "@/lib/supabase/client";

type Row = {
  id: string;
  sku: string;
  name: string;
  sold_by: "piece" | "weight";
  base_uom: string;
  is_active: boolean;
  category: { name: string } | null;
  variants: { id: string; name: string; is_default: boolean; is_active: boolean }[];
};

type PriceMap = Record<string, { pos?: number; online?: number }>;

const LIMIT = 500;

export default function ProductsPage() {
  const { user } = useAuth();
  const canEdit = canEditCatalog(user?.role);

  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [status, setStatus] = useState<"active" | "inactive" | "all">("active");
  const [categories, setCategories] = useState<Category[]>([]);
  const [rows, setRows] = useState<Row[] | null>(null);
  const [prices, setPrices] = useState<PriceMap>({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query.trim()), 250);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    supabase()
      .from("pos_categories")
      .select("id, name, is_active, sort_order")
      .order("sort_order")
      .order("name")
      .then(({ data }) => setCategories(data ?? []));
  }, []);

  useEffect(() => {
    let active = true;
    const sb = supabase();
    let q = sb
      .from("pos_products")
      .select(
        "id, sku, name, sold_by, base_uom, is_active, category:pos_categories(name), variants:pos_product_variants(id, name, is_default, is_active)",
      )
      .order("name")
      .limit(LIMIT);
    if (status !== "all") q = q.eq("is_active", status === "active");
    if (categoryId) q = q.eq("category_id", categoryId);
    if (debounced) {
      const term = debounced.replace(/[%,()]/g, " ");
      q = q.or(`name.ilike.%${term}%,sku.ilike.%${term}%`);
    }

    q.then(async ({ data, error: err }) => {
      if (!active) return;
      if (err) {
        setError(`Couldn't load products: ${err.message}`);
        setRows([]);
        return;
      }
      setError(null);
      const list = (data ?? []) as unknown as Row[];
      setRows(list);

      const variantIds = list.flatMap((p) => p.variants.filter((v) => v.is_default).map((v) => v.id));
      if (variantIds.length === 0) {
        setPrices({});
        return;
      }
      const { data: priceRows } = await sb
        .from("pos_current_prices")
        .select("variant_id, channel, price")
        .in("variant_id", variantIds);
      if (!active) return;
      const map: PriceMap = {};
      for (const pr of priceRows ?? []) {
        if (!pr.variant_id || !pr.channel || pr.price == null) continue;
        (map[pr.variant_id] ??= {})[pr.channel] = pr.price;
      }
      setPrices(map);
    });
    return () => {
      active = false;
    };
  }, [debounced, categoryId, status]);

  const activeCategories = useMemo(() => categories.filter((c) => c.is_active), [categories]);

  return (
    <div className="mx-auto max-w-6xl">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Products</h1>
          <p className="mt-1 text-sm text-muted">What you sell, how it&apos;s scanned or weighed, and its prices.</p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/admin/products/categories/"
            className="inline-flex h-10 items-center rounded-lg border border-line bg-surface px-4 text-sm font-medium hover:bg-surface-2"
          >
            Categories
          </Link>
          {canEdit ? (
            <Link
              href="/admin/products/edit/"
              className="inline-flex h-10 items-center rounded-lg bg-brand px-4 text-sm font-medium text-white hover:bg-brand-strong"
            >
              New product
            </Link>
          ) : null}
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <Input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search name or SKU"
          aria-label="Search products"
          className="w-full sm:w-72"
        />
        <Select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} aria-label="Category">
          <option value="">All categories</option>
          {activeCategories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
        <Select value={status} onChange={(e) => setStatus(e.target.value as typeof status)} aria-label="Status">
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="all">All</option>
        </Select>
      </div>

      <div className="mt-4">
        <FormError message={error} />
      </div>

      <Card className="mt-2 overflow-x-auto p-0">
        {rows === null ? (
          <div className="p-5">
            <Skeleton className="h-48" />
          </div>
        ) : rows.length === 0 ? (
          <EmptyState canEdit={canEdit} filtered={!!debounced || !!categoryId || status !== "active"} />
        ) : (
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b border-line text-xs text-muted">
              <tr>
                <th className="px-4 py-3 font-medium">SKU</th>
                <th className="px-4 py-3 font-medium">Product</th>
                <th className="px-4 py-3 font-medium">Category</th>
                <th className="px-4 py-3 font-medium">Sold by</th>
                <th className="px-4 py-3 text-right font-medium">POS price</th>
                <th className="px-4 py-3 text-right font-medium">Online price</th>
                <th className="px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map((p) => {
                const def = p.variants.find((v) => v.is_default);
                const activeVariants = p.variants.filter((v) => v.is_active).length;
                const pr = def ? prices[def.id] : undefined;
                return (
                  <tr key={p.id} className="hover:bg-surface-2/50">
                    <td className="px-4 py-3 font-mono text-xs">{p.sku}</td>
                    <td className="px-4 py-3">
                      <Link href={`/admin/products/edit/?id=${p.id}`} className="font-medium hover:text-brand">
                        {p.name}
                      </Link>
                      {activeVariants > 1 ? <span className="ml-2 text-xs text-muted">{activeVariants} variants</span> : null}
                    </td>
                    <td className="px-4 py-3 text-muted">{p.category?.name ?? "—"}</td>
                    <td className="px-4 py-3 text-muted">{p.sold_by === "weight" ? `Weight (${p.base_uom})` : "Piece"}</td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {formatPeso(pr?.pos)}
                      {def && p.sold_by === "weight" && pr?.pos != null ? <span className="text-muted">/{p.base_uom}</span> : null}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">{formatPeso(pr?.online)}</td>
                    <td className="px-4 py-3">
                      {p.is_active ? <Badge tone="ok">Active</Badge> : <Badge tone="muted">Inactive</Badge>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </Card>
      {rows && rows.length === LIMIT ? (
        <p className="mt-2 text-xs text-muted">Showing the first {LIMIT}. Search or filter to narrow the list.</p>
      ) : null}
    </div>
  );
}

function EmptyState({ canEdit, filtered }: { canEdit: boolean; filtered: boolean }) {
  return (
    <div className="px-6 py-14 text-center">
      <p className="font-medium">{filtered ? "No products match." : "No products yet."}</p>
      <p className="mt-1 text-sm text-muted">
        {filtered
          ? "Try a different search or filter."
          : canEdit
            ? "Add your first product, or set up categories first."
            : "Products will appear here once an owner or admin adds them."}
      </p>
      {!filtered && canEdit ? (
        <Link
          href="/admin/products/edit/"
          className="mt-4 inline-flex h-10 items-center rounded-lg bg-brand px-4 text-sm font-medium text-white hover:bg-brand-strong"
        >
          New product
        </Link>
      ) : null}
    </div>
  );
}
