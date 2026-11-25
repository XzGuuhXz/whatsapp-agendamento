import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { requiredEnv } from "../env";
let client: SupabaseClient | undefined;
// Exclusivo do servidor; nunca importar em componentes do cliente.
export function getAdmin(): SupabaseClient {
  if (typeof window !== "undefined") throw new Error("Cliente exclusivo do servidor");
  client ??= createClient(requiredEnv("NEXT_PUBLIC_SUPABASE_URL"), requiredEnv("SUPABASE_SERVICE_ROLE_KEY"), {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  return client;
}
