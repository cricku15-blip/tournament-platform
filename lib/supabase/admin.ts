import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { clientEnv } from "@/lib/env";
import { serverEnv } from "@/lib/env.server";
import type { Database } from "@/types/supabase";

export function createAdminClient() {
  const supabaseUrl = serverEnv.SUPABASE_URL || clientEnv.NEXT_PUBLIC_SUPABASE_URL;
  return createSupabaseClient<Database>(supabaseUrl, serverEnv.SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

export const adminClient = createAdminClient();
