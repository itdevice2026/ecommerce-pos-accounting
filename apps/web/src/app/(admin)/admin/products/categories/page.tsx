"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Badge, Button, Card, FormError, Input, Skeleton } from "@/components/ui";
import { useAuth } from "@/lib/auth";
import { canEditCatalog, type Category } from "@/lib/catalog";
import { supabase } from "@/lib/supabase/client";

type Row = Category & { product_count: number };

export default function CategoriesPage() {
  const { user } = useAuth();
  const canEdit = canEditCatalog(user?.role);
  const [rows, setRows] = useState<Row[] | null>(null);
  const [newName, setNewName] = useState("");
  const [editing, setEditing] = useState<{ id: string; name: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const { data, error: err } = await supabase()
      .from("pos_categories")
      .select("id, name, is_active, sort_order, products:pos_products(count)")
      .order("sort_order")
      .order("name");
    if (err) {
      setError(`Couldn't load categories: ${err.message}`);
      setRows([]);
      return;
    }
    setRows(
      (data ?? []).map((c) => ({
        id: c.id,
        name: c.name,
        is_active: c.is_active,
        sort_order: c.sort_order,
        product_count: (c.products as unknown as { count: number }[])[0]?.count ?? 0,
      })),
    );
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      if (active) await load();
    })();
    return () => {
      active = false;
    };
  }, [load]);

  async function run(action: () => PromiseLike<{ error: { message: string } | null }>) {
    setBusy(true);
    setError(null);
    const { error: err } = await action();
    setBusy(false);
    if (err) {
      setError(
        err.message.includes("pos_categories_company_id_name_key")
          ? "A category with that name already exists."
          : `Couldn't save: ${err.message}`,
      );
      return false;
    }
    await load();
    return true;
  }

  async function add(e: FormEvent) {
    e.preventDefault();
    const name = newName.trim();
    if (!name || !user?.companyId) return;
    const nextOrder = (rows?.reduce((m, r) => Math.max(m, r.sort_order), 0) ?? 0) + 10;
    if (await run(() => supabase().from("pos_categories").insert({ company_id: user.companyId!, name, sort_order: nextOrder }))) {
      setNewName("");
    }
  }

  async function rename(e: FormEvent) {
    e.preventDefault();
    if (!editing || !editing.name.trim()) return;
    if (await run(() => supabase().from("pos_categories").update({ name: editing.name.trim() }).eq("id", editing.id))) {
      setEditing(null);
    }
  }

  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/admin/products/" className="text-sm text-muted hover:text-ink">
        ← Products
      </Link>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight">Categories</h1>
      <p className="mt-1 text-sm text-muted">Group products for the POS screen, reports and the online store.</p>

      {canEdit ? (
        <form onSubmit={add} className="mt-6 flex gap-2">
          <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="New category, e.g. Pork, Frozen, Beverages" className="flex-1" aria-label="New category name" />
          <Button type="submit" disabled={busy || !newName.trim()}>
            Add
          </Button>
        </form>
      ) : null}

      <div className="mt-4">
        <FormError message={error} />
      </div>

      <Card className="mt-2 p-0">
        {rows === null ? (
          <div className="p-5">
            <Skeleton className="h-32" />
          </div>
        ) : rows.length === 0 ? (
          <p className="px-6 py-10 text-center text-sm text-muted">No categories yet.</p>
        ) : (
          <ul className="divide-y divide-line">
            {rows.map((c) => (
              <li key={c.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                {editing?.id === c.id ? (
                  <form onSubmit={rename} className="flex flex-1 gap-2">
                    <Input autoFocus value={editing.name} onChange={(e) => setEditing({ id: c.id, name: e.target.value })} className="flex-1" aria-label="Category name" />
                    <Button type="submit" disabled={busy} className="h-10">
                      Save
                    </Button>
                    <Button type="button" variant="ghost" onClick={() => setEditing(null)}>
                      Cancel
                    </Button>
                  </form>
                ) : (
                  <>
                    <span className={`flex-1 font-medium ${c.is_active ? "" : "text-muted line-through"}`}>{c.name}</span>
                    <span className="text-xs text-muted">
                      {c.product_count} product{c.product_count === 1 ? "" : "s"}
                    </span>
                    {!c.is_active ? <Badge tone="muted">Hidden</Badge> : null}
                    {canEdit ? (
                      <div className="flex gap-1">
                        <Button type="button" variant="ghost" className="h-8 px-2" onClick={() => setEditing({ id: c.id, name: c.name })}>
                          Rename
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          className="h-8 px-2"
                          disabled={busy}
                          onClick={() => run(() => supabase().from("pos_categories").update({ is_active: !c.is_active }).eq("id", c.id))}
                        >
                          {c.is_active ? "Hide" : "Show"}
                        </Button>
                      </div>
                    ) : null}
                  </>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
