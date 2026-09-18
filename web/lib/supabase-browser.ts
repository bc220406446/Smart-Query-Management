import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let browserClient: SupabaseClient | null = null;

export function getSupabaseBrowserClient(url: string, key: string) {
  if (!browserClient) browserClient = createClient(url, key);
  return browserClient;
}
