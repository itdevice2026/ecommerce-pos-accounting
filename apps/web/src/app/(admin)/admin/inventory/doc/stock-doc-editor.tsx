"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Badge, Button, Card, Field, FormError, Input, Select, Skeleton } from "@/components/ui";
import { useAuth } from "@/lib/auth";
import { formatPeso, parseAmount } from "@/lib/catalog";
import {
  DOC_TYPES,
  DOC_TYPE_LABEL,
  REASONS,
  STATUS_LABEL,
  canEditDoc,
  canPostDoc,
  canReceive,
  formatDate,
  formatQty,
  locationLabel,
  seesAllBranches,
  todayIso,
  useBranchesAndLocations,
  type AdjustReason,
  type DocStatus,
  type DocType,
} from "@/lib/inventory";
import { supabase } from "@/lib/supabase/client";
import { InventoryTabs } from "../tabs";
import { ProductPicker, type PickerProduct } from "./product-picker";

type Line = {
  key: string;
  id?: string;
  productId: string;
  qty: string;
  direction: "out" | "in"; // adjustments only
  unitCost: string;
  lotId: string;
  lotNo: string;
  expiry: string;
  reason: AdjustReason | "";
  note: string;
  receivedQty: number | null;
  receiveInput: string;
};

type Header = {
  docDate: string;
  branchId: string;
  locationId: string;
  toLocationId: string;
  supplierName: string;
  reference: string;
  note: string;
};

type Meta = {
  status: DocStatus;
  docNo: string | null;
  toBranchId: string | null;
  journalNo: number | null;
  postedAt: string | null;
  receivedAt: string | null;
};

type LotBalance = { lotId: string | null; lotNo: string | null; expiry: string | null; qty: number };

let keySeq = 0;
const newKey = () => `l${++keySeq}`;

export function StockDocEditor() {
  const params = useSearchParams();
  const router = useRouter();
  const id = params.get("id");
  const typeParam = params.get("type") as DocType | null;
  const { user } = useAuth();
  const { branches, locations } = useBranchesAndLocations();

  const [type, setType] = useState<DocType | null>(id ? null : DOC_TYPES.some((t) => t.value === typeParam) ? typeParam : "receipt");
  const [meta, setMeta] = useState<Meta | null>(null);
  const [header, setHeader] = useState<Header>({ docDate: todayIso(), branchId: "", locationId: "", toLocationId: "", supplierName: "", reference: "", note: "" });
  const [lines, setLines] = useState<Line[]>([]);
  const [products, setProducts] = useState<PickerProduct[]>([]);
  const [productInfo, setProductInfo] = useState<Record<string, PickerProduct>>({});
  const [available, setAvailable] = useState<Record<string, LotBalance[]>>({});
  const [loading, setLoading] = useState(!!id);
  const [notFound, setNotFound] = useState(false);
  const [busy, setBusy] = useState<null | "save" | "post" | "cancel" | "receive">(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  // Products that can be stocked.
  useEffect(() => {
    supabase()
      .from("pos_products")
      .select("id, sku, name, base_uom, track_lots")
      .eq("track_stock", true)
      .eq("is_active", true)
      .order("name")
      .then(({ data }) => {
        const list = data ?? [];
        setProducts(list);
        setProductInfo((m) => ({ ...Object.fromEntries(list.map((p) => [p.id, p])), ...m }));
      });
  }, []);

  // Existing document.
  useEffect(() => {
    if (!id) return;
    let active = true;
    (async () => {
      const sb = supabase();
      const { data: doc } = await sb
        .from("pos_stock_docs")
        .select(
          "id, doc_type, status, doc_no, doc_date, branch_id, location_id, to_location_id, to_branch_id, supplier_name, reference, note, journal_entry_id, posted_at, received_at, lines:pos_stock_doc_lines(id, line_no, product_id, qty, unit_cost, lot_id, lot_no, expiry_date, reason, note, received_qty, superseded, product:pos_products(id, sku, name, base_uom, track_lots), lot:pos_lots(lot_no, expiry_date))",
        )
        .eq("id", id)
        .eq("lines.superseded", false)
        .maybeSingle();
      if (!active) return;
      if (!doc) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      let journalNo: number | null = null;
      if (doc.journal_entry_id) {
        const { data: je } = await sb.from("pos_journal_entries").select("entry_no").eq("id", doc.journal_entry_id).maybeSingle();
        journalNo = je?.entry_no ?? null;
      }
      if (!active) return;
      setType(doc.doc_type);
      setMeta({
        status: doc.status,
        docNo: doc.doc_no,
        toBranchId: doc.to_branch_id,
        journalNo,
        postedAt: doc.posted_at,
        receivedAt: doc.received_at,
      });
      setHeader({
        docDate: doc.doc_date,
        branchId: doc.branch_id,
        locationId: doc.location_id,
        toLocationId: doc.to_location_id ?? "",
        supplierName: doc.supplier_name ?? "",
        reference: doc.reference ?? "",
        note: doc.note ?? "",
      });
      const sorted = [...doc.lines].sort((a, b) => a.line_no - b.line_no);
      setProductInfo((m) => ({ ...m, ...Object.fromEntries(sorted.filter((l) => l.product).map((l) => [l.product_id, l.product!])) }));
      setLines(
        sorted.map((l) => ({
          key: newKey(),
          id: l.id,
          productId: l.product_id,
          qty: String(Math.abs(l.qty)),
          direction: l.qty < 0 ? "out" : "in",
          unitCost: l.unit_cost != null ? String(l.unit_cost) : "",
          lotId: l.lot_id ?? "",
          lotNo: l.lot_no ?? l.lot?.lot_no ?? "",
          expiry: l.expiry_date ?? l.lot?.expiry_date ?? "",
          reason: l.reason ?? "",
          note: l.note ?? "",
          receivedQty: l.received_qty,
          receiveInput: String(l.qty),
        })),
      );
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [id, reloadKey]);

  const isDraft = !meta || meta.status === "draft";
  const editable = !!type && isDraft && canEditDoc(user, type, header.branchId || (type === "opening" ? null : user?.branchIds[0]));
  const postable = !!type && isDraft && canPostDoc(user, type, header.branchId);

  // Branch choices: everyone with access to all branches, otherwise the user's own.
  const branchOptions = useMemo(
    () => (branches ?? []).filter((b) => b.is_active && (seesAllBranches(user) || user?.branchIds.includes(b.id) || b.id === header.branchId)),
    [branches, user, header.branchId],
  );

  // Pick a branch and its default location for new documents.
  useEffect(() => {
    if (id || header.branchId || branchOptions.length === 0) return;
    const b = branchOptions.find((x) => user?.branchIds.includes(x.id)) ?? branchOptions[0];
    const loc = locations.find((l) => l.branch_id === b.id && l.is_default) ?? locations.find((l) => l.branch_id === b.id);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time defaulting once branches load
    setHeader((h) => ({ ...h, branchId: b.id, locationId: loc?.id ?? "" }));
  }, [id, header.branchId, branchOptions, locations, user]);

  const sourceLocations = locations.filter((l) => l.type === "storage" && l.branch_id === header.branchId && (l.is_active || l.id === header.locationId));
  const destLocations = locations.filter((l) => l.type === "storage" && l.id !== header.locationId && (l.is_active || l.id === header.toLocationId));

  // What's on hand at the source location (for outbound lines and lot choices).
  const loadAvailable = useCallback(async (locationId: string) => {
    if (!locationId) return {};
    const { data } = await supabase()
      .from("pos_stock_balances")
      .select("product_id, lot_id, qty, lot:pos_lots(lot_no, expiry_date)")
      .eq("location_id", locationId)
      .gt("qty", 0);
    const map: Record<string, LotBalance[]> = {};
    for (const b of data ?? []) {
      (map[b.product_id] ??= []).push({ lotId: b.lot_id, lotNo: b.lot?.lot_no ?? null, expiry: b.lot?.expiry_date ?? null, qty: b.qty });
    }
    for (const k of Object.keys(map)) map[k].sort((a, b) => (a.expiry ?? "9999").localeCompare(b.expiry ?? "9999"));
    return map;
  }, []);

  useEffect(() => {
    let active = true;
    loadAvailable(header.locationId).then((m) => active && setAvailable(m));
    return () => {
      active = false;
    };
  }, [header.locationId, loadAvailable, reloadKey]);

  function setH<K extends keyof Header>(k: K, v: Header[K]) {
    setHeader((h) => ({ ...h, [k]: v }));
  }

  function changeBranch(branchId: string) {
    const loc = locations.find((l) => l.branch_id === branchId && l.is_default) ?? locations.find((l) => l.branch_id === branchId && l.type === "storage");
    setHeader((h) => ({ ...h, branchId, locationId: loc?.id ?? "", toLocationId: h.toLocationId === loc?.id ? "" : h.toLocationId }));
  }

  function addLine(p: PickerProduct) {
    setProductInfo((m) => ({ ...m, [p.id]: p }));
    const outbound = type === "transfer" || type === "adjustment";
    const lots = available[p.id] ?? [];
    setLines((ls) => [
      ...ls,
      {
        key: newKey(),
        productId: p.id,
        qty: "",
        direction: "out",
        unitCost: "",
        lotId: outbound && p.track_lots && lots[0]?.lotId ? lots[0].lotId : "",
        lotNo: "",
        expiry: "",
        reason: type === "adjustment" ? "spoilage" : "",
        note: "",
        receivedQty: null,
        receiveInput: "",
      },
    ]);
  }

  function updateLine(key: string, patch: Partial<Line>) {
    setLines((ls) => ls.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  }

  function isOutbound(l: Line) {
    return type === "transfer" || (type === "adjustment" && l.direction === "out");
  }

  function validate(): string | null {
    if (!type) return "Choose a document type.";
    if (!header.branchId || !header.locationId) return "Choose the branch and location.";
    if (type === "transfer" && !header.toLocationId) return "Choose where the stock is going.";
    if (lines.length === 0) return "Add at least one product.";
    for (const [i, l] of lines.entries()) {
      const p = productInfo[l.productId];
      const label = p?.name ?? `Line ${i + 1}`;
      const q = parseAmount(l.qty);
      if (q === null || Number.isNaN(q) || q <= 0) return `${label}: enter a quantity more than 0.`;
      if (type === "opening" || type === "receipt") {
        const c = parseAmount(l.unitCost);
        if (c === null || Number.isNaN(c) || c < 0) return `${label}: enter the unit cost.`;
      }
      if (p?.track_lots) {
        if (isOutbound(l) && !l.lotId) return `${label}: choose the lot.`;
        if (!isOutbound(l) && !l.lotId && !l.lotNo.trim()) return `${label}: enter the lot number.`;
      }
      if (type === "adjustment" && !l.reason) return `${label}: choose a reason.`;
    }
    return null;
  }

  async function save(): Promise<string | null> {
    const problem = validate();
    if (problem) {
      setError(problem);
      return null;
    }
    setError(null);
    const payload = {
      id: id ?? undefined,
      doc_type: type,
      doc_date: header.docDate,
      branch_id: header.branchId,
      location_id: header.locationId,
      to_location_id: type === "transfer" ? header.toLocationId : "",
      supplier_name: header.supplierName,
      reference: header.reference,
      note: header.note,
      lines: lines.map((l) => {
        const q = parseAmount(l.qty)!;
        const p = productInfo[l.productId];
        const outbound = isOutbound(l);
        return {
          product_id: l.productId,
          qty: String(type === "adjustment" && l.direction === "out" ? -q : q),
          unit_cost: type === "opening" || type === "receipt" ? String(parseAmount(l.unitCost)) : "",
          lot_id: p?.track_lots ? l.lotId : "",
          lot_no: p?.track_lots && !outbound && !l.lotId ? l.lotNo : "",
          expiry_date: p?.track_lots && !outbound && !l.lotId ? l.expiry : "",
          reason: type === "adjustment" ? l.reason : "",
          note: l.note,
        };
      }),
    };
    const { data, error: err } = await supabase().rpc("pos_save_stock_doc", { p: payload });
    if (err) {
      setError(friendly(err.message));
      return null;
    }
    return data;
  }

  async function onSave() {
    setBusy("save");
    const docId = await save();
    setBusy(null);
    if (!docId) return;
    setNotice("Draft saved.");
    if (!id) router.replace(`/admin/inventory/doc/?id=${docId}`);
    else setReloadKey((k) => k + 1);
  }

  async function onPost() {
    setBusy("post");
    const docId = await save();
    if (!docId) {
      setBusy(null);
      return;
    }
    const { data, error: err } = await supabase().rpc("pos_post_stock_doc", { p_doc: docId });
    setBusy(null);
    if (err) {
      setError(friendly(err.message));
      if (!id) router.replace(`/admin/inventory/doc/?id=${docId}`);
      return;
    }
    setNotice(type === "transfer" ? `Posted ${data}. Stock is now in transit until the destination receives it.` : `Posted ${data}.`);
    if (!id) router.replace(`/admin/inventory/doc/?id=${docId}`);
    else setReloadKey((k) => k + 1);
  }

  async function onCancel() {
    if (!id) {
      router.push("/admin/inventory/documents/");
      return;
    }
    setBusy("cancel");
    const { error: err } = await supabase().rpc("pos_cancel_stock_doc", { p_doc: id });
    setBusy(null);
    if (err) return setError(friendly(err.message));
    setNotice("Draft cancelled.");
    setReloadKey((k) => k + 1);
  }

  async function onReceive() {
    if (!id) return;
    const received = [];
    for (const l of lines) {
      const r = parseAmount(l.receiveInput);
      const q = parseAmount(l.qty) ?? 0;
      if (r === null || Number.isNaN(r) || r < 0 || r > q) {
        setError(`${productInfo[l.productId]?.name}: received quantity must be between 0 and ${formatQty(q)}.`);
        return;
      }
      received.push({ line_id: l.id, received_qty: r });
    }
    setBusy("receive");
    setError(null);
    const { error: err } = await supabase().rpc("pos_receive_transfer", { p_doc: id, p_received: received });
    setBusy(null);
    if (err) return setError(friendly(err.message));
    setNotice("Transfer received.");
    setReloadKey((k) => k + 1);
  }

  if (loading || !type) return <Skeleton className="mx-auto h-96 max-w-5xl" />;
  if (notFound) {
    return (
      <div className="mx-auto max-w-5xl">
        <p className="font-medium">Document not found.</p>
        <Link href="/admin/inventory/documents/" className="mt-2 inline-block text-sm text-brand">
          Back to documents
        </Link>
      </div>
    );
  }

  const typeInfo = DOC_TYPES.find((t) => t.value === type)!;
  const showCost = type === "opening" || type === "receipt";
  const totalValue = showCost ? lines.reduce((s, l) => s + (parseAmount(l.qty) || 0) * (parseAmount(l.unitCost) || 0), 0) : 0;
  const inTransit = meta?.status === "in_transit";
  const showReceived = meta?.status === "received";

  return (
    <div className="mx-auto max-w-5xl">
      <Link href="/admin/inventory/documents/" className="text-sm text-muted hover:text-ink">
        ← Documents
      </Link>
      <div className="mt-2 flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">
          {DOC_TYPE_LABEL[type]}
          {meta?.docNo ? <span className="ml-2 font-mono text-lg text-muted">{meta.docNo}</span> : null}
        </h1>
        <Badge tone={meta?.status === "cancelled" ? "muted" : meta && meta.status !== "draft" ? "ok" : "neutral"}>
          {meta ? STATUS_LABEL[meta.status] : "New draft"}
        </Badge>
      </div>
      <p className="mt-1 text-sm text-muted">{typeInfo.help}</p>
      <InventoryTabs />

      {notice ? <p className="mt-4 rounded-lg border border-ok/30 bg-ok/10 px-3 py-2 text-sm text-ok">{notice}</p> : null}

      <fieldset disabled={!editable || !!busy} className="mt-6 flex flex-col gap-6">
        <Card>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Date">
              <Input type="date" value={header.docDate} onChange={(e) => setH("docDate", e.target.value)} max={todayIso()} />
            </Field>
            <Field label={type === "transfer" ? "From branch" : "Branch"}>
              <Select value={header.branchId} onChange={(e) => changeBranch(e.target.value)}>
                {branchOptions.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.code} · {b.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label={type === "transfer" ? "From location" : "Location"}>
              <Select value={header.locationId} onChange={(e) => setH("locationId", e.target.value)}>
                {sourceLocations.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                  </option>
                ))}
              </Select>
            </Field>
            {type === "transfer" ? (
              <Field label="To location">
                <Select value={header.toLocationId} onChange={(e) => setH("toLocationId", e.target.value)}>
                  <option value="">Choose destination…</option>
                  {destLocations.map((l) => (
                    <option key={l.id} value={l.id}>
                      {locationLabel(l, branches)}
                    </option>
                  ))}
                </Select>
              </Field>
            ) : null}
            {type === "receipt" ? (
              <Field label="Supplier">
                <Input value={header.supplierName} onChange={(e) => setH("supplierName", e.target.value)} placeholder="Who delivered" />
              </Field>
            ) : null}
            <Field label="Reference" hint={type === "receipt" ? "Delivery receipt or invoice no." : undefined}>
              <Input value={header.reference} onChange={(e) => setH("reference", e.target.value)} />
            </Field>
            <div className={type === "transfer" || type === "receipt" ? "" : "sm:col-span-2"}>
              <Field label="Note">
                <Input value={header.note} onChange={(e) => setH("note", e.target.value)} />
              </Field>
            </div>
          </div>
        </Card>

        <Card className="p-0">
          <div className="p-4">
            <h2 className="text-sm font-semibold">Products</h2>
            {editable ? (
              <div className="mt-3">
                <ProductPicker products={products} onPick={addLine} />
              </div>
            ) : null}
          </div>
          {lines.length === 0 ? (
            <p className="border-t border-line px-4 py-8 text-center text-sm text-muted">No products added yet.</p>
          ) : (
            <div className="overflow-x-auto border-t border-line">
              <table className="w-full min-w-[820px] text-left text-sm">
                <thead className="text-xs text-muted">
                  <tr className="border-b border-line">
                    <th className="px-4 py-2 font-medium">Product</th>
                    {type === "adjustment" ? <th className="px-2 py-2 font-medium">Change</th> : null}
                    <th className="px-2 py-2 font-medium">Qty</th>
                    {showCost ? <th className="px-2 py-2 font-medium">Unit cost</th> : null}
                    <th className="px-2 py-2 font-medium">Lot</th>
                    {type === "adjustment" ? <th className="px-2 py-2 font-medium">Reason</th> : null}
                    {inTransit || showReceived ? <th className="px-2 py-2 font-medium">Received</th> : null}
                    {showCost ? <th className="px-2 py-2 text-right font-medium">Amount</th> : null}
                    {editable ? <th className="px-2 py-2" /> : null}
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {lines.map((l) => {
                    const p = productInfo[l.productId];
                    const lots = available[l.productId] ?? [];
                    const onHand = lots.reduce((s, x) => s + x.qty, 0);
                    const outbound = isOutbound(l);
                    const amount = (parseAmount(l.qty) || 0) * (parseAmount(l.unitCost) || 0);
                    return (
                      <tr key={l.key} className="align-top">
                        <td className="px-4 py-3">
                          <div className="font-medium">{p?.name ?? "…"}</div>
                          <div className="font-mono text-xs text-muted">{p?.sku}</div>
                          {outbound && isDraft ? (
                            <div className="mt-1 text-xs text-muted">
                              On hand here: {formatQty(onHand)} {p?.base_uom}
                            </div>
                          ) : null}
                        </td>
                        {type === "adjustment" ? (
                          <td className="px-2 py-3">
                            <Select value={l.direction} onChange={(e) => updateLine(l.key, { direction: e.target.value as Line["direction"], lotId: "", reason: e.target.value === "in" ? "found" : "spoilage" })} aria-label="Change" className="w-28">
                              <option value="out">Remove</option>
                              <option value="in">Add</option>
                            </Select>
                          </td>
                        ) : null}
                        <td className="px-2 py-3">
                          <div className="flex items-center gap-1">
                            <Input inputMode="decimal" value={l.qty} onChange={(e) => updateLine(l.key, { qty: e.target.value })} className="w-24 text-right tabular-nums" aria-label="Quantity" />
                            <span className="text-xs text-muted">{p?.base_uom}</span>
                          </div>
                        </td>
                        {showCost ? (
                          <td className="px-2 py-3">
                            <Input inputMode="decimal" value={l.unitCost} onChange={(e) => updateLine(l.key, { unitCost: e.target.value })} placeholder="0.00" className="w-28 text-right tabular-nums" aria-label="Unit cost" />
                          </td>
                        ) : null}
                        <td className="px-2 py-3">
                          {!p?.track_lots ? (
                            <span className="text-xs text-muted">—</span>
                          ) : outbound ? (
                            isDraft ? (
                              <Select value={l.lotId} onChange={(e) => updateLine(l.key, { lotId: e.target.value })} aria-label="Lot" className="w-48">
                                <option value="">Choose lot…</option>
                                {lots.filter((x) => x.lotId).map((x) => (
                                  <option key={x.lotId!} value={x.lotId!}>
                                    {x.lotNo} · {formatQty(x.qty)}
                                    {x.expiry ? ` · exp ${formatDate(x.expiry)}` : ""}
                                  </option>
                                ))}
                              </Select>
                            ) : (
                              <span className="font-mono text-xs">{l.lotNo || "—"}</span>
                            )
                          ) : (
                            <div className="flex flex-col gap-1">
                              <Input value={l.lotNo} onChange={(e) => updateLine(l.key, { lotNo: e.target.value, lotId: "" })} placeholder="Lot no." className="w-36 font-mono" aria-label="Lot number" />
                              <Input type="date" value={l.expiry} onChange={(e) => updateLine(l.key, { expiry: e.target.value })} className="w-36" aria-label="Expiry date" title="Expiry date" />
                            </div>
                          )}
                        </td>
                        {type === "adjustment" ? (
                          <td className="px-2 py-3">
                            <Select value={l.reason} onChange={(e) => updateLine(l.key, { reason: e.target.value as AdjustReason })} aria-label="Reason" className="w-48">
                              {REASONS.filter((r) => r.direction === "both" || r.direction === l.direction).map((r) => (
                                <option key={r.value} value={r.value}>
                                  {r.label}
                                </option>
                              ))}
                            </Select>
                          </td>
                        ) : null}
                        {inTransit ? (
                          <td className="px-2 py-3">
                            <Input
                              inputMode="decimal"
                              value={l.receiveInput}
                              disabled={!canReceive(user, meta?.toBranchId) || !!busy}
                              onChange={(e) => updateLine(l.key, { receiveInput: e.target.value })}
                              className="w-24 text-right tabular-nums"
                              aria-label="Received quantity"
                            />
                          </td>
                        ) : showReceived ? (
                          <td className={`px-2 py-3 tabular-nums ${l.receivedQty != null && l.receivedQty < (parseAmount(l.qty) ?? 0) ? "font-semibold text-brand" : ""}`}>
                            {formatQty(l.receivedQty)}
                          </td>
                        ) : null}
                        {showCost ? <td className="px-2 py-3 text-right tabular-nums">{formatPeso(amount)}</td> : null}
                        {editable ? (
                          <td className="px-2 py-3 text-right">
                            <button type="button" onClick={() => setLines((ls) => ls.filter((x) => x.key !== l.key))} className="text-xs text-muted hover:text-danger">
                              Remove
                            </button>
                          </td>
                        ) : null}
                      </tr>
                    );
                  })}
                </tbody>
                {showCost ? (
                  <tfoot>
                    <tr className="border-t border-line">
                      <td colSpan={editable ? 4 : 4} className="px-4 py-3 text-right text-sm font-medium">
                        Total value
                      </td>
                      <td className="px-2 py-3 text-right font-semibold tabular-nums">{formatPeso(totalValue)}</td>
                      {editable ? <td /> : null}
                    </tr>
                  </tfoot>
                ) : null}
              </table>
            </div>
          )}
        </Card>
      </fieldset>

      <div className="mt-4">
        <FormError message={error} />
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm text-muted">
          {meta?.postedAt ? <>Posted {formatDate(meta.postedAt)}. </> : null}
          {meta?.receivedAt ? <>Received {formatDate(meta.receivedAt)}. </> : null}
          {meta?.journalNo ? <>Journal entry no. {meta.journalNo}.</> : null}
          {isDraft && editable && !postable ? <>A branch manager, owner or admin must post this.</> : null}
        </div>
        <div className="flex flex-wrap gap-2">
          {isDraft && editable ? (
            <>
              <Button type="button" variant="ghost" onClick={onCancel} disabled={!!busy}>
                {id ? (busy === "cancel" ? "Cancelling…" : "Cancel draft") : "Discard"}
              </Button>
              <Button type="button" variant="ghost" className="border border-line" onClick={onSave} disabled={!!busy}>
                {busy === "save" ? "Saving…" : "Save draft"}
              </Button>
              {postable ? (
                <Button type="button" onClick={onPost} disabled={!!busy}>
                  {busy === "post" ? "Posting…" : type === "transfer" ? "Post and send" : "Post"}
                </Button>
              ) : null}
            </>
          ) : null}
          {inTransit && canReceive(user, meta?.toBranchId) ? (
            <Button type="button" onClick={onReceive} disabled={!!busy}>
              {busy === "receive" ? "Receiving…" : "Receive transfer"}
            </Button>
          ) : null}
        </div>
      </div>
      {isDraft && editable ? (
        <p className="mt-2 text-right text-xs text-muted">Posting updates stock and the books. Posted documents can&apos;t be edited; correct them with an adjustment.</p>
      ) : null}
    </div>
  );
}

function friendly(message: string): string {
  if (message.includes("row-level security")) return "You don't have permission to change this document.";
  return message.replace(/^.*?ERROR:\s*/, "");
}
