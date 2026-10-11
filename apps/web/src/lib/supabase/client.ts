"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL, assertSupabaseEnv } from "./env";

let client: SupabaseClient<Database> | null = null;

/**
 * One Supabase client per browser tab. The session is kept in localStorage and
 * refreshed automatically. Row Level Security decides what each user can read
 * or change, so the publishable key is safe to ship in the page.
 */
export function supabase(): SupabaseClient<Database> {
  if (!client) {
    assertSupabaseEnv();
    client = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
      auth: { persistSession: true, autoRefreshToken: true, storageKey: "pos-auth" },
    });
  }
  return client;
}
