"use client";

import { useEffect, useState } from "react";
import type { AppRole, CurrentUser } from "@/lib/auth";
import type { Enums } from "@/lib/database.types";
import { supabase } from "@/lib/supabase/client";

export type DocType = Enums<"pos_stock_doc_type">;
export type DocStatus = Enums<"pos_stock_doc_status">;
export type AdjustReason = Enums<"pos_adjust_reason">;
export type MoveType = Enums<"pos_move_type">;

export const DOC_TYPES: { value: DocType; label: string; short: string; help: string }[] = [
  { value: "receipt", label: "Stock in", short: "Stock in", help: "Goods received from a supplier, at cost." },
  { value: "adjustment", label: "Adjustment", short: "Adjustment", help: "Spoilage, damage, count differences, items found." },
  { value: "transfer", label: "Transfer", short: "Transfer", help: "Move stock to another location or branch." },
  { value: "opening", label: "Opening stock", short: "Opening", help: "Stock you already have when starting the system." },
];

export const DOC_TYPE_LABEL: Record<DocType, string> = {
  opening: "Opening stock",
  receipt: "Stock in",
  adjustment: "Adjustment",
  transfer: "Transfer",
};

export const STATUS_LABEL: Record<DocStatus, string> = {
  draft: "Draft",
  posted: "Posted",
  in_transit: "In transit",
  received: "Received",
  cancelled: "Cancelled",
};

export const REASONS: { value: AdjustReason; label: string; direction: "out" | "in" | "both" }[] = [
  { value: "spoilage", label: "Spoilage", direction: "out" },
  { value: "damage", label: "Damage", direction: "out" },
  { value: "expired", label: "Expired", direction: "out" },
  { value: "shrinkage", label: "Shrinkage / missing", direction: "out" },
  { value: "count_variance", label: "Count difference", direction: "both" },
  { value: "found", label: "Found / returned to stock", direction: "in" },
  { value: "other", label: "Other", direction: "both" },
];

export const MOVE_LABEL: Record<MoveType, string> = {
  opening: "Opening",
  receipt: "Stock in",
  adjustment: "Adjustment",
  transfer_out: "Transfer out",
  transfer_in: "Transfer in",
  sale: "Sale",
  sale_return: "Sale return",
};

const qtyFmt = new Intl.NumberFormat("en-PH", { maximumFractionDigits: 3 });
export function formatQty(n: number | null | undefined) {
  return n == null ? "—" : qtyFmt.format(n);
}

export function formatDate(d: string | null | undefined) {
  if (!d) return "—";
  const date = new Date(d.length === 10 ? `${d}T00:00:00` : d);
  return date.toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" });
}

export function todayIso() {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

export function addDaysIso(days: number) {
  const now = new Date();
  now.setDate(now.getDate() + days);
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

// Mirrors pos_private.can_edit_doc / can_post_doc; the database enforces the real rules.
function inBranch(user: CurrentUser, branchId: string | null | undefined) {
  return !!branchId && user.branchIds.includes(branchId);
}
const has = (user: CurrentUser, ...roles: AppRole[]) => !!user.role && roles.includes(user.role);

export function canEditDoc(user: CurrentUser | null, type: DocType, branchId: string | null | undefined) {
  if (!user) return false;
  return has(user, "owner", "admin") || (type !== "opening" && has(user, "branch_manager", "warehouse") && inBranch(user, branchId));
}

export function canPostDoc(user: CurrentUser | null, type: DocType, branchId: string | null | undefined) {
  if (!user) return false;
  return (
    has(user, "owner", "admin") ||
    (type !== "opening" && has(user, "branch_manager") && inBranch(user, branchId)) ||
    ((type === "receipt" || type === "transfer") && has(user, "warehouse") && inBranch(user, branchId))
  );
}

export function canReceive(user: CurrentUser | null, toBranchId: string | null | undefined) {
  if (!user) return false;
  return has(user, "owner", "admin") || (has(user, "branch_manager", "warehouse") && inBranch(user, toBranchId));
}

export function seesAllBranches(user: CurrentUser | null) {
  return !!user && has(user, "owner", "admin", "accountant");
}

export type Branch = { id: string; code: string; name: string; is_active: boolean };
export type Location = {
  id: string;
  name: string;
  branch_id: string | null;
  type: "storage" | "transit";
  is_default: boolean;
  is_active: boolean;
};

/** Branches and stock locations of the company, loaded once per page. */
export function useBranchesAndLocations() {
  const [branches, setBranches] = useState<Branch[] | null>(null);
  const [locations, setLocations] = useState<Location[]>([]);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let active = true;
    const sb = supabase();
    Promise.all([
      sb.from("pos_branches").select("id, code, name, is_active").order("code"),
      sb.from("pos_stock_locations").select("id, name, branch_id, type, is_default, is_active").order("name"),
    ]).then(([b, l]) => {
      if (!active) return;
      setBranches(b.data ?? []);
      setLocations((l.data ?? []).sort((x, y) => Number(y.is_default) - Number(x.is_default) || x.name.localeCompare(y.name)));
    });
    return () => {
      active = false;
    };
  }, [version]);

  return { branches, locations, reload: () => setVersion((v) => v + 1) };
}

export function locationLabel(loc: Location | undefined, branches: Branch[] | null) {
  if (!loc) return "—";
  if (loc.type === "transit") return "In transit";
  const b = branches?.find((x) => x.id === loc.branch_id);
  return b ? `${b.code} · ${loc.name}` : loc.name;
}
