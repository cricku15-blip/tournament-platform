import type { SupabaseClient } from "@supabase/supabase-js";

/** Owner, assistant organizer or (via RLS) nobody else. The database function is the source of truth. */
export async function canOrganize(supabase: SupabaseClient, tournamentId: string, userId: string, organizerId?: string | null): Promise<boolean> {
  if (organizerId && organizerId === userId) return true;
  const { data } = await supabase.rpc("is_tournament_organizer", { tid: tournamentId });
  return data === true;
}

/** PostgREST `or` filter matching tournaments the user owns or assists. Pass the user's assistant tournament ids. */
export async function ownedOrAssistedFilter(supabase: SupabaseClient, userId: string): Promise<string> {
  const { data } = await supabase.from("tournament_assistants").select("tournament_id").eq("user_id", userId).limit(100);
  const ids = (data ?? []).map((r: { tournament_id: string }) => r.tournament_id);
  return ids.length ? `organizer_id.eq.${userId},id.in.(${ids.join(",")})` : `organizer_id.eq.${userId}`;
}
