import "server-only";
import { createClient } from "@/lib/supabase/server";
import { clientEnv } from "@/lib/env";

export type EdgeResult<T> = { ok: true; data: T } | { ok: false; status: number; error: string };

/** Calls a Supabase Edge Function with the signed-in user's JWT. The service role key never leaves the function. */
export async function callEdge<T>(name: string, body: unknown): Promise<EdgeResult<T>> {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) return { ok: false, status: 401, error: "not_authenticated" };
  try {
    const res = await fetch(`${clientEnv.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/${name}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${session.access_token}`, apikey: clientEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY, "Content-Type": "application/json" },
      body: JSON.stringify(body ?? {}),
      signal: AbortSignal.timeout(15000),
      cache: "no-store",
    });
    const json = (await res.json().catch(() => ({}))) as T & { error?: string };
    if (!res.ok) return { ok: false, status: res.status, error: json.error ?? "server_error" };
    return { ok: true, data: json };
  } catch {
    return { ok: false, status: 502, error: "server_error" };
  }
}
