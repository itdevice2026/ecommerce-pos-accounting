"use client";

import { useState, type FormEvent } from "react";
import { Badge, Button, Card, Field, FormError, Input, Select, Skeleton } from "@/components/ui";
import { useAuth } from "@/lib/auth";
import { canEditCatalog } from "@/lib/catalog";
import { useBranchesAndLocations } from "@/lib/inventory";
import { supabase } from "@/lib/supabase/client";
import { InventoryHeader } from "../tabs";

export default function LocationsPage() {
  const { user } = useAuth();
  const canEdit = canEditCatalog(user?.role); // owner/admin, same as RLS
  const { branches, locations, reload } = useBranchesAndLocations();
  const [branchId, setBranchId] = useState("");
  const [name, setName] = useState("");
  const [editing, setEditing] = useState<{ id: string; name: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const targetBranch = branchId || branches?.[0]?.id || "";

  async function run(action: () => PromiseLike<{ error: { message: string } | null }>) {
    setBusy(true);
    setError(null);
    const { error: err } = await action();
    setBusy(false);
    if (err) {
      setError(err.message.includes("pos_stock_locations_name_key") ? "That branch already has a location with this name." : `Couldn't save: ${err.message}`);
      return false;
    }
    reload();
    return true;
  }

  async function add(e: FormEvent) {
    e.preventDefault();
    if (!name.trim() || !user?.companyId || !targetBranch) return;
    if (await run(() => supabase().from("pos_stock_locations").insert({ company_id: user.companyId!, branch_id: targetBranch, name: name.trim(), type: "storage" }))) {
      setName("");
    }
  }

  async function rename(e: FormEvent) {
    e.preventDefault();
    if (!editing?.name.trim()) return;
    if (await run(() => supabase().from("pos_stock_locations").update({ name: editing.name.trim() }).eq("id", editing.id))) setEditing(null);
  }

  return (
    <div className="mx-auto max-w-4xl">
      <InventoryHeader title="Inventory" subtitle="Where stock is kept in each branch: main stockroom, chiller, freezer, display." />

      {canEdit ? (
        <Card className="mt-6">
          <form onSubmit={add} className="grid gap-3 sm:grid-cols-[14rem_1fr_auto] sm:items-end">
            <Field label="Branch">
              <Select value={targetBranch} onChange={(e) => setBranchId(e.target.value)}>
                {(branches ?? []).map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.code} · {b.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="New location">
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Freezer 1, Chiller, Display" />
            </Field>
            <Button type="submit" disabled={busy || !name.trim()}>
              Add
            </Button>
          </form>
        </Card>
      ) : null}

      <div className="mt-4">
        <FormError message={error} />
      </div>

      {branches === null ? (
        <Skeleton className="mt-2 h-40" />
      ) : (
        <div className="mt-2 flex flex-col gap-4">
          {branches.map((b) => {
            const locs = locations.filter((l) => l.branch_id === b.id);
            return (
              <Card key={b.id} className="p-0">
                <h2 className="px-4 pt-4 text-sm font-semibold">
                  {b.code} · {b.name}
                </h2>
                <ul className="mt-2 divide-y divide-line border-t border-line">
                  {locs.map((l) => (
                    <li key={l.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                      {editing?.id === l.id ? (
                        <form onSubmit={rename} className="flex flex-1 gap-2">
                          <Input autoFocus value={editing.name} onChange={(e) => setEditing({ id: l.id, name: e.target.value })} className="flex-1" aria-label="Location name" />
                          <Button type="submit" disabled={busy}>
                            Save
                          </Button>
                          <Button type="button" variant="ghost" onClick={() => setEditing(null)}>
                            Cancel
                          </Button>
                        </form>
                      ) : (
                        <>
                          <span className={`flex-1 font-medium ${l.is_active ? "" : "text-muted line-through"}`}>{l.name}</span>
                          {l.is_default ? <Badge tone="ok">Default</Badge> : null}
                          {!l.is_active ? <Badge tone="muted">Inactive</Badge> : null}
                          {canEdit ? (
                            <div className="flex gap-1">
                              <Button type="button" variant="ghost" className="h-8 px-2" onClick={() => setEditing({ id: l.id, name: l.name })}>
                                Rename
                              </Button>
                              {!l.is_default ? (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  className="h-8 px-2"
                                  disabled={busy}
                                  onClick={() => run(() => supabase().from("pos_stock_locations").update({ is_active: !l.is_active }).eq("id", l.id))}
                                >
                                  {l.is_active ? "Deactivate" : "Activate"}
                                </Button>
                              ) : null}
                            </div>
                          ) : null}
                        </>
                      )}
                    </li>
                  ))}
                </ul>
              </Card>
            );
          })}
          <p className="text-xs text-muted">
            Stock being transferred sits in a shared &ldquo;In transit&rdquo; location until the destination receives it.
          </p>
        </div>
      )}
    </div>
  );
}
