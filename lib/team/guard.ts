import "server-only";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { canOrganize } from "@/lib/organizer/access";
import { getProfile, getSessionUser } from "@/lib/session";
import type { Database } from "@/types/supabase";

export type TeamRow = Database["public"]["Tables"]["teams"]["Row"];
export type TournamentRow = Database["public"]["Tables"]["tournaments"]["Row"];
export type TeamAccess = "manager" | "organizer" | "admin";

/** Manager of the team, organizer of its tournament, or admin. Anyone else gets a 404. RLS still guards every write. */
export async function requireTeamAccess(teamId: string): Promise<{ team: TeamRow; tournament: TournamentRow; access: TeamAccess; userId: string }> {
  if (!/^[0-9a-f-]{36}$/i.test(teamId)) notFound();
  const user = await getSessionUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(`/manager/teams/${teamId}`)}`);
  const supabase = await createClient();
  const { data: team } = await supabase.from("teams").select("*").eq("id", teamId).maybeSingle();
  if (!team) notFound();
  const { data: tournament } = await supabase.from("tournaments").select("*").eq("id", team.tournament_id).maybeSingle();
  if (!tournament) notFound();
  const profile = await getProfile();
  const access: TeamAccess | null = team.manager_id === user.id ? "manager" : (await canOrganize(supabase, tournament.id, user.id, tournament.organizer_id)) ? "organizer" : profile?.is_admin ? "admin" : null;
  if (!access) notFound();
  return { team, tournament, access, userId: user.id };
}
