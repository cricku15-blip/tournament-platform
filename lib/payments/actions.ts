"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

/** Signed link (60 s) to a receipt in the private invoices bucket. RLS only lets owners (or admins) read their folder. */
export async function getReceiptUrl(kind: "tournament" | "subscription", paymentId: string): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  if (!z.string().uuid().safeParse(paymentId).success || !["tournament", "subscription"].includes(kind)) return { ok: false, error: "Bad request." };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Please log in again." };
  const path =
    kind === "tournament"
      ? (await supabase.from("tournament_payments").select("invoice_url").eq("id", paymentId).maybeSingle()).data?.invoice_url
      : (await supabase.from("subscription_payments").select("receipt_url").eq("id", paymentId).maybeSingle()).data?.receipt_url;
  if (!path) return { ok: false, error: "The receipt isn't ready yet. Try again in a minute." };
  const { data, error } = await supabase.storage.from("invoices").createSignedUrl(path, 60);
  if (error || !data) return { ok: false, error: "Couldn't open the receipt." };
  return { ok: true, url: data.signedUrl };
}

export async function latestTournamentPaymentId(tournamentId: string): Promise<string | null> {
  if (!z.string().uuid().safeParse(tournamentId).success) return null;
  const supabase = await createClient();
  const { data } = await supabase.from("tournament_payments").select("id").eq("tournament_id", tournamentId).eq("status", "paid").order("created_at", { ascending: false }).limit(1).maybeSingle();
  return data?.id ?? null;
}
