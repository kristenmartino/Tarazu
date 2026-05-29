// @ts-check
import { createClient } from "@supabase/supabase-js";

/** @type {import("@supabase/supabase-js").SupabaseClient | undefined} */
let client;

export function getSupabase() {
  if (!client) {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) return null;
    client = createClient(url, key);
  }
  return client;
}
