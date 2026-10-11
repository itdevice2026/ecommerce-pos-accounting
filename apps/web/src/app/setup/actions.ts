"use server";

import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export type SetupState = {
  error: string | null;
  values: { name: string; tin: string; branchCode: string; branchName: string; vatRegistered: boolean };
};

export async function setupCompany(_prev: SetupState, formData: FormData): Promise<SetupState> {
  const values = {
    name: String(formData.get("name") ?? "").trim(),
    tin: String(formData.get("tin") ?? "").trim(),
    branchCode: String(formData.get("branchCode") ?? "").trim().toUpperCase(),
    branchName: String(formData.get("branchName") ?? "").trim(),
    vatRegistered: formData.get("vatRegistered") === "on",
  };

  // Server Actions can be called directly, so re-check the caller here.
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/setup");
  if (user.role) redirect("/admin");

  if (!values.name) return { error: "Enter the company name.", values };
  if (!values.branchCode || !values.branchName) return { error: "Enter the first branch's code and name.", values };
  if (!/^[A-Z0-9-]{2,12}$/.test(values.branchCode)) {
    return { error: "Branch code: 2–12 letters, numbers or dashes (for example MAIN or LT-01).", values };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("pos_bootstrap_company", {
    p_name: values.name,
    p_tin: values.tin || undefined,
    p_vat_registered: values.vatRegistered,
    p_branch_code: values.branchCode,
    p_branch_name: values.branchName,
  });

  if (error) {
    const message = error.message.includes("already been set up")
      ? "A company is already set up in this system. Ask its owner to add you as a user."
      : error.message.includes("not allowed")
        ? "Your account isn't on the setup allow-list. Ask IT to add your email before running company setup."
        : `Setup failed: ${error.message}`;
    return { error: message, values };
  }

  redirect("/admin");
}
