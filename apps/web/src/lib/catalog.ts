import type { AppRole } from "@/lib/auth";
import type { Enums, Tables } from "@/lib/database.types";

export type SoldBy = Enums<"pos_sold_by">;
export type Category = Pick<Tables<"pos_categories">, "id" | "name" | "is_active" | "sort_order">;
export type TaxCode = Pick<Tables<"pos_tax_codes">, "id" | "code" | "name" | "rate" | "type">;

/** Units offered in the forms. Free text is still stored, so new units can be added here later. */
export const UNITS = [
  { value: "pc", label: "piece (pc)" },
  { value: "kg", label: "kilogram (kg)" },
  { value: "g", label: "gram (g)" },
  { value: "pack", label: "pack" },
  { value: "tray", label: "tray" },
  { value: "box", label: "box" },
  { value: "case", label: "case" },
  { value: "bottle", label: "bottle" },
  { value: "can", label: "can" },
  { value: "sachet", label: "sachet" },
  { value: "L", label: "liter (L)" },
  { value: "mL", label: "milliliter (mL)" },
];

/** Who may add or change products, categories and prices (mirrors the RLS policies). */
export const CATALOG_EDITORS: AppRole[] = ["owner", "admin"];

export function canEditCatalog(role: AppRole | null | undefined) {
  return !!role && CATALOG_EDITORS.includes(role);
}

const peso = new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP", minimumFractionDigits: 2 });

export function formatPeso(value: number | null | undefined) {
  return value == null ? "—" : peso.format(value);
}

/** Parse a money/quantity input; returns null for blank, NaN for invalid. */
export function parseAmount(raw: string): number | null {
  const cleaned = raw.replace(/[₱,\s]/g, "");
  if (cleaned === "") return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : NaN;
}
