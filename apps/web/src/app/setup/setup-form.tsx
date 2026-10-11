"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button, Field, FormError, Input, Skeleton } from "@/components/ui";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase/client";

/** Shows the setup form only to a signed-in user who has no POS role yet. */
export function SetupGate() {
  const { loading, user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) router.replace("/login/?next=/setup/");
    else if (user.role) router.replace("/admin/");
  }, [loading, user, router]);

  if (loading || !user || user.role) return <Skeleton className="h-96" />;
  return <SetupForm />;
}

function SetupForm() {
  const { reload } = useAuth();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const name = String(form.get("name") ?? "").trim();
    const tin = String(form.get("tin") ?? "").trim();
    const branchCode = String(form.get("branchCode") ?? "").trim().toUpperCase();
    const branchName = String(form.get("branchName") ?? "").trim();
    const vatRegistered = form.get("vatRegistered") === "on";

    if (!name) return setError("Enter the company name.");
    if (!branchCode || !branchName) return setError("Enter the first branch's code and name.");
    if (!/^[A-Z0-9-]{2,12}$/.test(branchCode)) {
      return setError("Branch code: 2–12 letters, numbers or dashes (for example MAIN or LT-01).");
    }

    setPending(true);
    setError(null);
    // The database re-checks everything: allow-list, signed-in user, no existing company.
    const { error: rpcError } = await supabase().rpc("pos_bootstrap_company", {
      p_name: name,
      p_tin: tin || undefined,
      p_vat_registered: vatRegistered,
      p_branch_code: branchCode,
      p_branch_name: branchName,
    });

    if (rpcError) {
      setPending(false);
      const msg = rpcError.message;
      setError(
        msg.includes("already been set up")
          ? "A company is already set up in this system. Ask its owner to add you as a user."
          : msg.includes("not allowed")
            ? "Your account isn't on the setup allow-list. Ask IT to add your email before running company setup."
            : `Setup failed: ${msg}`,
      );
      return;
    }

    await reload();
    router.replace("/admin/");
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5">
      <fieldset className="flex flex-col gap-4">
        <legend className="mb-3 text-sm font-semibold">Company</legend>
        <Field label="Registered name">
          <Input name="name" required placeholder="e.g. Sample Trading Corporation" />
        </Field>
        <Field label="TIN" hint="Optional now; needed before printing official receipts.">
          <Input name="tin" placeholder="000-000-000-00000" />
        </Field>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="vatRegistered" defaultChecked className="size-4 accent-[var(--brand)]" />
          VAT-registered (12% output VAT)
        </label>
      </fieldset>

      <fieldset className="flex flex-col gap-4 border-t border-line pt-5">
        <legend className="mb-3 pt-5 text-sm font-semibold">First branch</legend>
        <div className="grid gap-4 sm:grid-cols-[8rem_1fr]">
          <Field label="Code">
            <Input name="branchCode" required defaultValue="MAIN" className="uppercase" />
          </Field>
          <Field label="Name">
            <Input name="branchName" required defaultValue="Main Branch" />
          </Field>
        </div>
      </fieldset>

      <FormError message={error} />
      <Button type="submit" disabled={pending}>
        {pending ? "Setting up…" : "Create company"}
      </Button>
      <p className="text-xs text-muted">
        This also loads the chart of accounts, VAT tax codes and this year&apos;s fiscal periods, and makes you the
        owner. It can only be done once.
      </p>
    </form>
  );
}
