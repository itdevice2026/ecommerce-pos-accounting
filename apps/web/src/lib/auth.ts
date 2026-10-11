import "server-only";
import { redirect } from "next/navigation";
import type { Enums } from "@/lib/database.types";
import { createClient } from "@/lib/supabase/server";

export type AppRole = Enums<"pos_app_role">;

export type CurrentUser = {
  id: string;
  email: string | null;
  role: AppRole | null;
  companyId: string | null;
  branchIds: string[];
};

export const ROLE_LABELS: Record<AppRole, string> = {
  owner: "Owner",
  admin: "Admin",
  accountant: "Accountant",
  branch_manager: "Branch manager",
  cashier: "Cashier",
  warehouse: "Warehouse",
  customer: "Customer",
};

/** Roles that can open the back office. */
export const BACK_OFFICE_ROLES: AppRole[] = ["owner", "admin", "accountant", "branch_manager", "warehouse"];
/** Roles that can open the POS. */
export const POS_ROLES: AppRole[] = ["owner", "admin", "branch_manager", "cashier"];

/**
 * Data Access Layer entry point: verifies the session on the server and reads
 * the caller's role from user_roles (RLS lets each user read their own row).
 * Returns null when nobody is signed in.
 */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (error || !claims?.sub) return null;

  const { data: roleRow } = await supabase
    .from("pos_user_roles")
    .select("role, company_id, branch_ids")
    .eq("user_id", claims.sub)
    .order("created_at")
    .limit(1)
    .maybeSingle();

  return {
    id: claims.sub,
    email: typeof claims.email === "string" ? claims.email : null,
    role: roleRow?.role ?? null,
    companyId: roleRow?.company_id ?? null,
    branchIds: roleRow?.branch_ids ?? [],
  };
}

/**
 * Use at the top of a protected Server Component or Server Action.
 * Signed out → /login. Signed in without a company role → /setup.
 * Wrong role → /no-access.
 */
export async function requireRole(allowed: AppRole[], nextPath: string): Promise<CurrentUser & { role: AppRole }> {
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(nextPath)}`);
  if (!user.role) redirect("/setup");
  if (!allowed.includes(user.role)) redirect("/no-access");
  return user as CurrentUser & { role: AppRole };
}
