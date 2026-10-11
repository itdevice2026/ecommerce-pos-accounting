"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { Button, Card, Field, FormError, Input, Select, Skeleton } from "@/components/ui";
import { useAuth } from "@/lib/auth";
import { UNITS, canEditCatalog, parseAmount, type Category, type SoldBy, type TaxCode } from "@/lib/catalog";
import { supabase } from "@/lib/supabase/client";

type VariantDraft = {
  key: string; // stable React key
  id?: string;
  name: string;
  barcode: string;
  plu: string;
  uom: string;
  conversion: string;
  isDefault: boolean;
  posPrice: string;
  onlinePrice: string;
};

type ProductDraft = {
  sku: string;
  name: string;
  description: string;
  categoryId: string;
  soldBy: SoldBy;
  baseUom: string;
  taxCodeId: string;
  trackStock: boolean;
  trackLots: boolean;
  reorderPoint: string;
  isActive: boolean;
};

let keySeq = 0;
const newKey = () => `v${++keySeq}`;

function blankVariant(soldBy: SoldBy, isDefault: boolean): VariantDraft {
  return {
    key: newKey(),
    name: soldBy === "weight" ? "Per kg" : "Each",
    barcode: "",
    plu: "",
    uom: soldBy === "weight" ? "kg" : "pc",
    conversion: "1",
    isDefault,
    posPrice: "",
    onlinePrice: "",
  };
}

const emptyProduct: ProductDraft = {
  sku: "",
  name: "",
  description: "",
  categoryId: "",
  soldBy: "piece",
  baseUom: "pc",
  taxCodeId: "",
  trackStock: true,
  trackLots: false,
  reorderPoint: "",
  isActive: true,
};

export function ProductForm() {
  const id = useSearchParams().get("id");
  const router = useRouter();
  const { user } = useAuth();
  const canEdit = canEditCatalog(user?.role);

  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [taxCodes, setTaxCodes] = useState<TaxCode[]>([]);
  const [product, setProduct] = useState<ProductDraft>(emptyProduct);
  const [variants, setVariants] = useState<VariantDraft[]>(() => [blankVariant("piece", true)]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.companyId) return;
    let active = true;
    const sb = supabase();

    (async () => {
      const [cats, taxes, company] = await Promise.all([
        sb.from("pos_categories").select("id, name, is_active, sort_order").order("sort_order").order("name"),
        sb.from("pos_tax_codes").select("id, code, name, rate, type").eq("is_active", true).order("code"),
        sb.from("pos_companies").select("vat_registered").eq("id", user.companyId!).maybeSingle(),
      ]);
      if (!active) return;
      setCategories(cats.data ?? []);
      const taxList = taxes.data ?? [];
      setTaxCodes(taxList);

      if (!id) {
        // New product: default tax code follows the company's VAT registration.
        const wanted = company.data?.vat_registered ? "VAT12" : "EXEMPT";
        setProduct((p) => ({ ...p, taxCodeId: taxList.find((t) => t.code === wanted)?.id ?? "" }));
        setLoading(false);
        return;
      }

      const { data: prod } = await sb
        .from("pos_products")
        .select(
          "id, sku, name, description, category_id, sold_by, base_uom, tax_code_id, track_stock, track_lots, reorder_point, is_active, variants:pos_product_variants(id, name, barcode, plu, uom, conversion_to_base, is_default, is_active, sort_order)",
        )
        .eq("id", id)
        .maybeSingle();
      if (!active) return;
      if (!prod) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      const activeVariants = prod.variants.filter((v) => v.is_active).sort((a, b) => a.sort_order - b.sort_order);
      const { data: priceRows } = await sb
        .from("pos_current_prices")
        .select("variant_id, channel, price")
        .in(
          "variant_id",
          activeVariants.map((v) => v.id),
        );
      if (!active) return;
      const priceOf = (vid: string, ch: "pos" | "online") =>
        priceRows?.find((r) => r.variant_id === vid && r.channel === ch)?.price;

      setProduct({
        sku: prod.sku,
        name: prod.name,
        description: prod.description ?? "",
        categoryId: prod.category_id ?? "",
        soldBy: prod.sold_by,
        baseUom: prod.base_uom,
        taxCodeId: prod.tax_code_id ?? "",
        trackStock: prod.track_stock,
        trackLots: prod.track_lots,
        reorderPoint: prod.reorder_point?.toString() ?? "",
        isActive: prod.is_active,
      });
      setVariants(
        activeVariants.length > 0
          ? activeVariants.map((v) => ({
              key: newKey(),
              id: v.id,
              name: v.name,
              barcode: v.barcode ?? "",
              plu: v.plu ?? "",
              uom: v.uom,
              conversion: String(v.conversion_to_base),
              isDefault: v.is_default,
              posPrice: priceOf(v.id, "pos")?.toFixed(2) ?? "",
              onlinePrice: priceOf(v.id, "online")?.toFixed(2) ?? "",
            }))
          : [blankVariant(prod.sold_by, true)],
      );
      setLoading(false);
    })();

    return () => {
      active = false;
    };
  }, [id, user?.companyId]);

  function setField<K extends keyof ProductDraft>(key: K, value: ProductDraft[K]) {
    setProduct((p) => ({ ...p, [key]: value }));
  }

  function changeSoldBy(soldBy: SoldBy) {
    setProduct((p) => ({ ...p, soldBy, baseUom: soldBy === "weight" ? "kg" : "pc" }));
    // A brand-new single variant follows the switch; edited variants are left alone.
    setVariants((vs) =>
      vs.length === 1 && !vs[0].id && !vs[0].barcode && !vs[0].plu ? [{ ...blankVariant(soldBy, true), posPrice: vs[0].posPrice, onlinePrice: vs[0].onlinePrice }] : vs,
    );
  }

  function updateVariant(key: string, patch: Partial<VariantDraft>) {
    setVariants((vs) =>
      vs.map((v) => (v.key === key ? { ...v, ...patch } : patch.isDefault ? { ...v, isDefault: false } : v)),
    );
  }

  function removeVariant(key: string) {
    setVariants((vs) => {
      const next = vs.filter((v) => v.key !== key);
      if (next.length > 0 && !next.some((v) => v.isDefault)) next[0] = { ...next[0], isDefault: true };
      return next;
    });
  }

  function validate(): string | null {
    if (!product.sku.trim()) return "Enter a SKU.";
    if (!product.name.trim()) return "Enter the product name.";
    if (variants.length === 0) return "Add at least one variant.";
    if (variants.filter((v) => v.isDefault).length !== 1) return "Mark one variant as the default.";
    const rp = parseAmount(product.reorderPoint);
    if (Number.isNaN(rp) || (rp !== null && rp < 0)) return "Reorder point must be a number of zero or more.";
    const barcodes = new Set<string>();
    const plus = new Set<string>();
    for (const [i, v] of variants.entries()) {
      const label = `Variant ${i + 1}`;
      if (!v.name.trim()) return `${label}: enter a name.`;
      const conv = parseAmount(v.conversion);
      if (conv === null || Number.isNaN(conv) || conv <= 0) return `${label}: quantity per unit must be more than 0.`;
      for (const [field, raw] of [["POS price", v.posPrice], ["Online price", v.onlinePrice]] as const) {
        const n = parseAmount(raw);
        if (Number.isNaN(n) || (n !== null && n < 0)) return `${label}: ${field} must be a number of zero or more.`;
      }
      if (v.barcode.trim()) {
        if (barcodes.has(v.barcode.trim())) return `${label}: barcode is used twice.`;
        barcodes.add(v.barcode.trim());
      }
      if (v.plu.trim()) {
        if (plus.has(v.plu.trim())) return `${label}: PLU is used twice.`;
        plus.add(v.plu.trim());
      }
    }
    return null;
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const problem = validate();
    if (problem) {
      setError(problem);
      return;
    }
    setSaving(true);
    setError(null);
    const payload = {
      id: id ?? undefined,
      sku: product.sku.trim(),
      name: product.name.trim(),
      description: product.description,
      category_id: product.categoryId,
      sold_by: product.soldBy,
      base_uom: product.baseUom,
      tax_code_id: product.taxCodeId,
      track_stock: product.trackStock,
      track_lots: product.trackLots,
      reorder_point: product.reorderPoint.trim(),
      is_active: product.isActive,
      variants: variants.map((v) => ({
        id: v.id,
        name: v.name,
        barcode: v.barcode,
        plu: v.plu,
        uom: v.uom,
        conversion_to_base: String(parseAmount(v.conversion)),
        is_default: v.isDefault,
        is_active: true,
        pos_price: v.posPrice.trim() === "" ? "" : String(parseAmount(v.posPrice)),
        online_price: v.onlinePrice.trim() === "" ? "" : String(parseAmount(v.onlinePrice)),
      })),
    };

    const { data, error: rpcError } = await supabase().rpc("pos_save_product", { p: payload });
    setSaving(false);
    if (rpcError) {
      setError(friendlyError(rpcError.message));
      return;
    }
    if (!id && data) {
      router.replace(`/admin/products/edit/?id=${data}`);
    }
    setSavedAt(new Date().toLocaleTimeString("en-PH", { hour: "numeric", minute: "2-digit" }));
  }

  if (loading) return <Skeleton className="mx-auto h-96 max-w-4xl" />;
  if (notFound) {
    return (
      <div className="mx-auto max-w-4xl">
        <p className="font-medium">Product not found.</p>
        <Link href="/admin/products/" className="mt-2 inline-block text-sm text-brand">
          Back to products
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="mx-auto max-w-4xl">
      <Link href="/admin/products/" className="text-sm text-muted hover:text-ink">
        ← Products
      </Link>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">{id ? product.name || "Edit product" : "New product"}</h1>
        {!canEdit ? <span className="text-sm text-muted">View only. Owners and admins can edit products.</span> : null}
      </div>

      <fieldset disabled={!canEdit || saving} className="mt-6 flex flex-col gap-6">
        <Card>
          <h2 className="text-sm font-semibold">Details</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-[12rem_1fr]">
            <Field label="SKU" hint="Your own product code.">
              <Input value={product.sku} onChange={(e) => setField("sku", e.target.value.toUpperCase())} required className="font-mono uppercase" />
            </Field>
            <Field label="Name">
              <Input value={product.name} onChange={(e) => setField("name", e.target.value)} required />
            </Field>
          </div>
          <div className="mt-4">
            <Field label="Description" hint="Optional. Shown on the online store later.">
              <textarea
                value={product.description}
                onChange={(e) => setField("description", e.target.value)}
                rows={2}
                className="rounded-lg border border-line bg-surface px-3 py-2 text-sm focus:border-brand focus:ring-2 focus:ring-brand/20 focus:outline-none"
              />
            </Field>
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <Field label="Category">
              <Select value={product.categoryId} onChange={(e) => setField("categoryId", e.target.value)}>
                <option value="">No category</option>
                {categories
                  .filter((c) => c.is_active || c.id === product.categoryId)
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
              </Select>
            </Field>
            <Field label="Sold by">
              <Select value={product.soldBy} onChange={(e) => changeSoldBy(e.target.value as SoldBy)}>
                <option value="piece">Piece (scan or count)</option>
                <option value="weight">Weight (weighed on a scale)</option>
              </Select>
            </Field>
            <Field label="Tax">
              <Select value={product.taxCodeId} onChange={(e) => setField("taxCodeId", e.target.value)}>
                <option value="">None</option>
                {taxCodes.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
        </Card>

        <Card>
          <h2 className="text-sm font-semibold">Stock</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <Field label="Stock unit" hint="Stock is counted in this unit.">
              <Select value={product.baseUom} onChange={(e) => setField("baseUom", e.target.value)}>
                {UNITS.map((u) => (
                  <option key={u.value} value={u.value}>
                    {u.label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Reorder point" hint={`Alert when stock falls to this many ${product.baseUom}.`}>
              <Input inputMode="decimal" value={product.reorderPoint} onChange={(e) => setField("reorderPoint", e.target.value)} />
            </Field>
            <div className="flex flex-col justify-center gap-2 text-sm">
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={product.trackStock} onChange={(e) => setField("trackStock", e.target.checked)} className="size-4 accent-[var(--brand)]" />
                Track stock
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={product.trackLots} onChange={(e) => setField("trackLots", e.target.checked)} className="size-4 accent-[var(--brand)]" />
                Track lots and expiry dates
              </label>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-semibold">Variants and prices</h2>
              <p className="mt-0.5 text-xs text-muted">
                Each way this product is sold: per kg on the scale, a fixed pack, a box of 12. Prices include tax.
              </p>
            </div>
            {canEdit ? (
              <Button type="button" variant="ghost" className="h-8 border border-line px-3" onClick={() => setVariants((vs) => [...vs, blankVariant(product.soldBy, vs.length === 0)])}>
                Add variant
              </Button>
            ) : null}
          </div>

          <div className="mt-4 flex flex-col gap-3">
            {variants.map((v, i) => (
              <div key={v.key} className="rounded-lg border border-line p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <label className="flex items-center gap-2 text-sm font-medium">
                    <input
                      type="radio"
                      name="default-variant"
                      checked={v.isDefault}
                      onChange={() => updateVariant(v.key, { isDefault: true })}
                      className="size-4 accent-[var(--brand)]"
                    />
                    {v.isDefault ? "Default variant" : `Variant ${i + 1}`}
                  </label>
                  {canEdit && variants.length > 1 ? (
                    <button type="button" onClick={() => removeVariant(v.key)} className="text-xs text-muted hover:text-danger">
                      Remove
                    </button>
                  ) : null}
                </div>
                <div className="mt-3 grid gap-3 sm:grid-cols-4">
                  <Field label="Name">
                    <Input value={v.name} onChange={(e) => updateVariant(v.key, { name: e.target.value })} />
                  </Field>
                  <Field label="Sale unit">
                    <Select value={v.uom} onChange={(e) => updateVariant(v.key, { uom: e.target.value })}>
                      {UNITS.map((u) => (
                        <option key={u.value} value={u.value}>
                          {u.label}
                        </option>
                      ))}
                    </Select>
                  </Field>
                  <Field label={`${product.baseUom} per ${v.uom}`} hint="How much stock one sale unit uses.">
                    <Input inputMode="decimal" value={v.conversion} onChange={(e) => updateVariant(v.key, { conversion: e.target.value })} />
                  </Field>
                  <div className="hidden sm:block" />
                  <Field label="Barcode">
                    <Input value={v.barcode} onChange={(e) => updateVariant(v.key, { barcode: e.target.value })} className="font-mono" />
                  </Field>
                  <Field label="Scale PLU" hint={product.soldBy === "weight" ? "Code keyed on the scale." : undefined}>
                    <Input value={v.plu} onChange={(e) => updateVariant(v.key, { plu: e.target.value })} className="font-mono" />
                  </Field>
                  <Field label={`POS price per ${v.uom}`}>
                    <Input inputMode="decimal" placeholder="0.00" value={v.posPrice} onChange={(e) => updateVariant(v.key, { posPrice: e.target.value })} className="text-right tabular-nums" />
                  </Field>
                  <Field label="Online price" hint="Leave blank to use the POS price.">
                    <Input inputMode="decimal" placeholder="Same as POS" value={v.onlinePrice} onChange={(e) => updateVariant(v.key, { onlinePrice: e.target.value })} className="text-right tabular-nums" />
                  </Field>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <FormError message={error} />

        <Card className="flex flex-wrap items-center justify-between gap-3">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={product.isActive} onChange={(e) => setField("isActive", e.target.checked)} className="size-4 accent-[var(--brand)]" />
            Active (available for sale)
          </label>
          {canEdit ? (
            <div className="flex items-center gap-3">
              {savedAt && !saving ? <span className="text-sm text-ok">Saved at {savedAt}</span> : null}
              <Button type="submit" disabled={saving}>
                {saving ? "Saving…" : id ? "Save changes" : "Create product"}
              </Button>
            </div>
          ) : null}
        </Card>
      </fieldset>
    </form>
  );
}

function friendlyError(message: string): string {
  if (message.includes("pos_products_company_id_sku_key")) return "Another product already uses this SKU.";
  if (message.includes("pos_product_variants_barcode_key")) return "That barcode is already used by another product.";
  if (message.includes("pos_product_variants_plu_key")) return "That scale PLU is already used by another product.";
  if (message.includes("row-level security") || message.includes("not allowed")) return "Only owners and admins can save products.";
  return `Couldn't save: ${message}`;
}
