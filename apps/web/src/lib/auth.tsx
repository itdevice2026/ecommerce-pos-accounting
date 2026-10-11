"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import type { Enums } from "@/lib/database.types";
import { supabase } from "@/lib/supabase/client";

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

type AuthState = {
  loading: boolean;
  user: CurrentUser | null;
  /** Re-read the POS role after it changes (e.g. after company setup). */
  reload: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

async function loadUser(): Promise<CurrentUser | null> {
  const sb = supabase();
  const { data } = await sb.auth.getUser(); // verified with the Auth server
  const authUser = data.user;
  if (!authUser) return null;

  const { data: roleRow } = await sb
    .from("pos_user_roles")
    .select("role, company_id, branch_ids")
    .eq("user_id", authUser.id)
    .order("created_at")
    .limit(1)
    .maybeSingle();

  return {
    id: authUser.id,
    email: authUser.email ?? null,
    role: roleRow?.role ?? null,
    companyId: roleRow?.company_id ?? null,
    branchIds: roleRow?.branch_ids ?? [],
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<{ loading: boolean; user: CurrentUser | null }>({ loading: true, user: null });

  const reload = useCallback(async () => {
    const user = await loadUser();
    setState({ loading: false, user });
  }, []);

  useEffect(() => {
    let active = true;
    loadUser().then((user) => active && setState({ loading: false, user }));
    const { data: sub } = supabase().auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN" || event === "SIGNED_OUT" || event === "USER_UPDATED") {
        loadUser().then((user) => active && setState({ loading: false, user }));
      }
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const signOut = useCallback(async () => {
    await supabase().auth.signOut();
    setState({ loading: false, user: null });
  }, []);

  return <AuthContext value={{ ...state, reload, signOut }}>{children}</AuthContext>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}

/**
 * Client-side gate for a page or section. Signed out → /login, signed in
 * without a POS role → /setup, wrong role → /no-access. This only controls
 * what the screen shows; RLS in Supabase is what actually protects the data.
 */
export function RequireRole({ roles, children, fallback }: { roles: AppRole[]; children: ReactNode; fallback: ReactNode }) {
  const { loading, user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const verdict = loading
    ? "loading"
    : !user
      ? "login"
      : !user.role
        ? "setup"
        : !roles.includes(user.role)
          ? "no-access"
          : "ok";

  useEffect(() => {
    if (verdict === "login") router.replace(`/login/?next=${encodeURIComponent(pathname)}`);
    if (verdict === "setup") router.replace("/setup/");
    if (verdict === "no-access") router.replace("/no-access/");
  }, [verdict, router, pathname]);

  return verdict === "ok" ? <>{children}</> : <>{fallback}</>;
}
