import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseKey);
export const isDemoMode =
  !isSupabaseConfigured &&
  process.env.NODE_ENV === "development" &&
  process.env.NEXT_PUBLIC_DEMO_MODE !== "false";

let browserClient: SupabaseClient<Database> | null = null;

export function getSupabaseBrowserClient(): SupabaseClient<Database> {
  if (!isSupabaseConfigured || !supabaseUrl || !supabaseKey) {
    throw new Error("Supabase is not configured. Add its URL and publishable key to .env.local.");
  }
  browserClient ??= createBrowserClient<Database>(supabaseUrl, supabaseKey);
  return browserClient;
}
