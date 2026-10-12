"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Badge, Card, FormError, Select, Skeleton } from "@/components/ui";
import { useAuth } from "@/lib/auth";
import {
  DOC_TYPES,
  DOC_TYPE_LABEL,
  STATUS_LABEL,
  canEditDoc,
  formatDate,
  locationLabel,
  useBranchesAndLocations,
  type DocStatus,
  type DocType,
} from "@/lib/inventory";
import { supabase } from "@/lib/supabase/client";
import { InventoryHeader } from "../tabs";

type DocRow = {
  id: string;
  doc_no: string | null;
  doc_type: DocType;
  status: DocStatus;
  doc_date: string;
  location_id: string;
  to_location_id: string | null;
  supplier_name: string | null;
  reference: string | null;
  created_at: string;
  lines: { count: number }[];
};

const STATUS_TONE: Record<DocStatus, "neutral" | "ok" | "muted"> = {
  draft: "neutral",
  posted: "ok",
  in_transit: "neutral",
  received: "ok",
  cancelled: "muted",
};

export default function StockDocumentsPage() {
  const { user } = useAuth();
  const { branches, locations } = useBranchesAndLocations();
  const [type, setType] = useState<"" | DocType>("");
  const [status, setStatus] = useState<"" | DocStatus | "open">("");
  const [rows, setRows] = useState<DocRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let q = supabase()
      .from("pos_stock_docs")
      .select("id, doc_no, doc_type, status, doc_date, location_id, to_location_id, supplier_name, reference, created_at, lines:pos_stock_doc_lines(count)")
      .eq("lines.superseded", false)
      .order("created_at", { ascending: false })
      .limit(200);
    if (type) q = q.eq("doc_type", type);
    if (status === "open") q = q.in("status", ["draft", "in_transit"]);
    else if (status) q = q.eq("status", status);
    q.then(({ data, error: err }) => {
      if (err) setError(`Couldn't load documents: ${err.message}`);
      setRows((data ?? []) as unknown as DocRow[]);
    });
  }, [type, status]);

  const creatable = DOC_TYPES.filter((t) => canEditDoc(user, t.value, t.value === "opening" ? null : user?.branchIds[0]));

  return (
    <div className="mx-auto max-w-6xl">
      <InventoryHeader
        title="Inventory"
        subtitle="Every stock change is a document: draft it, then post it."
        actions={creatable.map((t, i) => (
          <Link
            key={t.value}
            href={`/admin/inventory/doc/?type=${t.value}`}
            className={`inline-flex h-10 items-center rounded-lg px-4 text-sm font-medium ${
              i === 0 ? "bg-brand text-white hover:bg-brand-strong" : "border border-line bg-surface hover:bg-surface-2"
            }`}
          >
            {t.label}
          </Link>
        ))}
      />

      <div className="mt-6 flex flex-wrap gap-3">
        <Select value={type} onChange={(e) => setType(e.target.value as typeof type)} aria-label="Type">
          <option value="">All types</option>
          {DOC_TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </Select>
        <Select value={status} onChange={(e) => setStatus(e.target.value as typeof status)} aria-label="Status">
          <option value="">All statuses</option>
          <option value="open">Needs action (draft or in transit)</option>
          {(Object.keys(STATUS_LABEL) as DocStatus[]).map((s) => (
            <option key={s} value={s}>
              {STATUS_LABEL[s]}
            </option>
          ))}
        </Select>
      </div>

      <div className="mt-3">
        <FormError message={error} />
      </div>

      <Card className="mt-2 overflow-x-auto p-0">
        {rows === null ? (
          <div className="p-5">
            <Skeleton className="h-48" />
          </div>
        ) : rows.length === 0 ? (
          <p className="px-6 py-14 text-center text-sm text-muted">No documents yet.</p>
        ) : (
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="border-b border-line text-xs text-muted">
              <tr>
                <th className="px-4 py-3 font-medium">No.</th>
                <th className="px-4 py-3 font-medium">Type</th>
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium">Location</th>
                <th className="px-4 py-3 font-medium">Details</th>
                <th className="px-4 py-3 text-right font-medium">Lines</th>
                <th className="px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map((d) => {
                const from = locationLabel(locations.find((l) => l.id === d.location_id), branches);
                const to = d.to_location_id ? locationLabel(locations.find((l) => l.id === d.to_location_id), branches) : null;
                return (
                  <tr key={d.id} className="hover:bg-surface-2/50">
                    <td className="px-4 py-3">
                      <Link href={`/admin/inventory/doc/?id=${d.id}`} className="font-mono text-xs font-medium hover:text-brand">
                        {d.doc_no ?? "Draft"}
                      </Link>
                    </td>
                    <td className="px-4 py-3">{DOC_TYPE_LABEL[d.doc_type]}</td>
                    <td className="px-4 py-3 text-muted">{formatDate(d.doc_date)}</td>
                    <td className="px-4 py-3 text-muted">{to ? `${from} → ${to}` : from}</td>
                    <td className="px-4 py-3 text-muted">{[d.supplier_name, d.reference].filter(Boolean).join(" · ") || "—"}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{d.lines[0]?.count ?? 0}</td>
                    <td className="px-4 py-3">
                      <Badge tone={STATUS_TONE[d.status]}>{STATUS_LABEL[d.status]}</Badge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
