import { createClient, SupabaseClient } from "@supabase/supabase-js";

export function getSupabaseClient(userJwt: string): SupabaseClient {
  // Dung anon key + user JWT de RLS hoat dong dung
  // KHONG DUOC dung service_role key o day
  return createClient(
    process.env.SUPABASE_URL || "http://127.0.0.1:54321",
    process.env.SUPABASE_ANON_KEY || "dummy-anon-key",
    { global: { headers: { Authorization: `Bearer ${userJwt}` } } }
  );
}

// System client for tasks that bypass RLS (like checking invite tokens globally or updating sync_log)
// Use with extreme caution.
export function getServiceSupabaseClient(): SupabaseClient {
  return createClient(
    process.env.SUPABASE_URL || "http://127.0.0.1:54321",
    process.env.SUPABASE_SERVICE_ROLE_KEY || "dummy-service-key"
  );
}
