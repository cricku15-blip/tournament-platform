import "server-only";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getProfile, getSessionUser } from "@/lib/session";
import type { Database } from "@/types/supabase";

export type TournamentRow = Database["public"]["Tables"]["tournaments"]["Row"];

/** Loads a tournament the current user owns (or any, for admins). 404s otherwise. RLS is the real guard. */
export async function requireOwnedTournament(id: string): Promise<{ tournament: TournamentRow; userId: string }> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const user = await getSessionUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(`/organizer/tournaments/${id}`)}`);
  const supabase = await createClient();
  const { data } = await supabase.from("tournaments").select("*").eq("id", id).maybeSingle();
  if (!data) notFound();
  const profile = await getProfile();
  if (data.organizer_id !== user.id && !profile?.is_admin) notFound();
  return { tournament: data, userId: user.id };
}
