// supabase/functions/_shared/clients.ts
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

export const corsHeaders = {
  "Access-Control-Allow-Origin": Deno.env.get("ALLOWED_ORIGIN") ?? "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

export function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

export function adminClient() {
  return createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
}

export async function getUser(req: Request) {
  const token = req.headers.get("Authorization")?.replace("Bearer ", "");
  if (!token) return null;
  const { data } = await adminClient().auth.getUser(token);
  return data.user ?? null;
}

export async function isAdmin(userId: string) {
  const { data } = await adminClient().from("profiles").select("is_admin").eq("id", userId).single();
  return data?.is_admin === true;
}

export function isServiceCall(req: Request) {
  return req.headers.get("Authorization") === `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`;
}

export function handleOptions(req: Request) {
  return req.method === "OPTIONS" ? new Response("ok", { headers: corsHeaders }) : null;
}
