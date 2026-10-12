"use client";

import { useMemo, useState } from "react";
import { Input } from "@/components/ui";

export type PickerProduct = { id: string; sku: string; name: string; base_uom: string; track_lots: boolean };

/** Type to search by name or SKU, press Enter or click to add. */
export function ProductPicker({ products, onPick, disabled }: { products: PickerProduct[]; onPick: (p: PickerProduct) => void; disabled?: boolean }) {
  const [term, setTerm] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);

  const matches = useMemo(() => {
    const t = term.trim().toLowerCase();
    if (!t) return [];
    const exact = products.filter((p) => p.sku.toLowerCase() === t);
    const rest = products.filter((p) => p.sku.toLowerCase() !== t && (p.name.toLowerCase().includes(t) || p.sku.toLowerCase().includes(t)));
    return [...exact, ...rest].slice(0, 8);
  }, [term, products]);

  function pick(p: PickerProduct) {
    onPick(p);
    setTerm("");
    setActive(0);
    setOpen(false);
  }

  return (
    <div className="relative">
      <Input
        value={term}
        disabled={disabled}
        onChange={(e) => {
          setTerm(e.target.value);
          setOpen(true);
          setActive(0);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onKeyDown={(e) => {
          if (!matches.length) return;
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setActive((a) => Math.min(a + 1, matches.length - 1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActive((a) => Math.max(a - 1, 0));
          } else if (e.key === "Enter") {
            e.preventDefault();
            pick(matches[active]);
          }
        }}
        placeholder={products.length ? "Add a product: type name or SKU" : "No stock-tracked products yet"}
        aria-label="Add product"
        className="w-full"
        role="combobox"
        aria-expanded={open && matches.length > 0}
      />
      {open && matches.length > 0 ? (
        <ul className="absolute z-10 mt-1 max-h-72 w-full overflow-auto rounded-lg border border-line bg-surface py-1 shadow-lg" role="listbox">
          {matches.map((p, i) => (
            <li key={p.id} role="option" aria-selected={i === active}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => pick(p)}
                className={`flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm ${i === active ? "bg-surface-2" : ""}`}
              >
                <span>
                  <span className="font-medium">{p.name}</span>
                  {p.track_lots ? <span className="ml-2 text-xs text-muted">lots</span> : null}
                </span>
                <span className="font-mono text-xs text-muted">{p.sku}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
