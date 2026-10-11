"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { SignOutButton } from "@/components/sign-out-button";
import { Card, Skeleton } from "@/components/ui";
import { POS_ROLES, ROLE_LABELS, RequireRole, useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase/client";

export default function PosPage() {
  return (
    <main className="flex flex-1 flex-col">
      <header className="flex items-center justify-between border-b border-line bg-surface px-4 py-3">
        <Link href="/" className="text-sm font-semibold tracking-wide text-brand uppercase">
          POS
        </Link>
        <SignOutButton className="h-8 px-3" />
      </header>
      <div className="flex flex-1 items-center justify-center px-4 py-16">
        <RequireRole roles={POS_ROLES} fallback={<Skeleton className="h-48 w-full max-w-md" />}>
          <PosHome />
        </RequireRole>
      </div>
    </main>
  );
}

function PosHome() {
  const { user } = useAuth();
  const [loaded, setLoaded] = useState<{ id: string; code: string; name: string }[] | null>(null);
  const hasBranches = (user?.branchIds.length ?? 0) > 0;

  useEffect(() => {
    if (!user || user.branchIds.length === 0) return;
    supabase()
      .from("pos_branches")
      .select("id, code, name")
      .in("id", user.branchIds)
      .then(({ data }) => setLoaded(data ?? []));
  }, [user]);

  if (!user?.role) return null;
  const branches = hasBranches ? loaded : [];

  return (
    <Card className="w-full max-w-md text-center">
      <p className="text-xs font-medium text-muted">Signed in as {ROLE_LABELS[user.role]}</p>
      <h1 className="mt-2 text-xl font-semibold">Cashier screen arrives in Phase 3</h1>
      <p className="mt-2 text-sm text-muted">
        {branches === null
          ? "Loading your branch…"
          : branches.length > 0
            ? `Assigned to ${branches.map((b) => `${b.code} · ${b.name}`).join(", ")}.`
            : "No branch assigned yet. Ask an admin to assign you to a branch."}
      </p>
    </Card>
  );
}
