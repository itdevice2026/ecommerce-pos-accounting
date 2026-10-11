import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { signOut } from "@/app/login/actions";
import { Button, Card, Skeleton } from "@/components/ui";
import { POS_ROLES, ROLE_LABELS, requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Point of sale" };

export default function PosPage() {
  return (
    <main className="flex flex-1 flex-col">
      <header className="flex items-center justify-between border-b border-line bg-surface px-4 py-3">
        <Link href="/" className="text-sm font-semibold tracking-wide text-brand uppercase">
          POS
        </Link>
        <form action={signOut}>
          <Button variant="ghost" className="h-8 px-3">
            Sign out
          </Button>
        </form>
      </header>
      <div className="flex flex-1 items-center justify-center px-4 py-16">
        <Suspense fallback={<Skeleton className="h-48 w-full max-w-md" />}>
          <PosHome />
        </Suspense>
      </div>
    </main>
  );
}

async function PosHome() {
  const user = await requireRole(POS_ROLES, "/pos");
  const supabase = await createClient();
  const { data: branches } = await supabase.from("pos_branches").select("id, code, name").in("id", user.branchIds);

  return (
    <Card className="w-full max-w-md text-center">
      <p className="text-xs font-medium text-muted">Signed in as {ROLE_LABELS[user.role]}</p>
      <h1 className="mt-2 text-xl font-semibold">Cashier screen arrives in Phase 3</h1>
      <p className="mt-2 text-sm text-muted">
        {branches && branches.length > 0
          ? `Assigned to ${branches.map((b) => `${b.code} · ${b.name}`).join(", ")}.`
          : "No branch assigned yet. Ask an admin to assign you to a branch."}
      </p>
    </Card>
  );
}
