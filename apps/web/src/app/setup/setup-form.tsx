"use client";

import { useActionState } from "react";
import { Button, Field, FormError, Input } from "@/components/ui";
import { setupCompany, type SetupState } from "./actions";

const initialState: SetupState = {
  error: null,
  values: { name: "", tin: "", branchCode: "MAIN", branchName: "Main Branch", vatRegistered: true },
};

export function SetupForm() {
  const [state, formAction, pending] = useActionState(setupCompany, initialState);
  const v = state.values;

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <fieldset className="flex flex-col gap-4">
        <legend className="mb-3 text-sm font-semibold">Company</legend>
        <Field label="Registered name">
          <Input name="name" required defaultValue={v.name} placeholder="e.g. Sample Trading Corporation" />
        </Field>
        <Field label="TIN" hint="Optional now; needed before printing official receipts.">
          <Input name="tin" defaultValue={v.tin} placeholder="000-000-000-00000" />
        </Field>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="vatRegistered"
            defaultChecked={v.vatRegistered}
            className="size-4 accent-[var(--brand)]"
          />
          VAT-registered (12% output VAT)
        </label>
      </fieldset>

      <fieldset className="flex flex-col gap-4 border-t border-line pt-5">
        <legend className="mb-3 pt-5 text-sm font-semibold">First branch</legend>
        <div className="grid gap-4 sm:grid-cols-[8rem_1fr]">
          <Field label="Code">
            <Input name="branchCode" required defaultValue={v.branchCode} className="uppercase" />
          </Field>
          <Field label="Name">
            <Input name="branchName" required defaultValue={v.branchName} />
          </Field>
        </div>
      </fieldset>

      <FormError message={state.error} />
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
