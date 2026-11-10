import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireOwnedTournament } from "@/lib/organizer/guard";
import { ResultForm } from "@/components/domain/results/result-form";
import { stateFromSaved, type Player, type TeamInfo } from "@/components/domain/results/types";
import { formatDateTime } from "@/lib/format";

export const metadata: Metadata = { title: "Enter result" };

export default async function ResultPage({ params }: { params: Promise<{ id: string; matchId: string }> }) {
  const { id, matchId } = await params;
  const { tournament: t } = await requireOwnedTournament(id);
  if (!/^[0-9a-f-]{36}$/i.test(matchId)) notFound();
  const supabase = await createClient();

  const { data: m } = await supabase.from("matches").select("*").eq("id", matchId).eq("tournament_id", t.id).maybeSingle();
  if (!m) notFound();
  if (!m.team_a_id || !m.team_b_id) notFound(); // both teams must be decided before a result can be entered

  const [sport, teamsRes, squads, bat, bowl, field, lines, events] = await Promise.all([
    supabase.from("sports").select("slug").eq("id", t.sport_id).maybeSingle(),
    supabase.from("public_teams").select("id, name").in("id", [m.team_a_id, m.team_b_id]),
    supabase.from("squad_members").select("team_id, user_id").in("team_id", [m.team_a_id, m.team_b_id]).limit(100),
    supabase.from("cricket_batting").select("*").eq("match_id", m.id).order("innings"),
    supabase.from("cricket_bowling").select("*").eq("match_id", m.id).order("innings"),
    supabase.from("cricket_fielding").select("*").eq("match_id", m.id),
    supabase.from("football_lineups").select("*").eq("match_id", m.id),
    supabase.from("football_events").select("*").eq("match_id", m.id).order("minute", { ascending: true }),
  ]);
  const uids = [...new Set((squads.data ?? []).map((s) => s.user_id))];
  const { data: profiles } = uids.length ? await supabase.from("public_profiles").select("id, full_name").in("id", uids) : { data: [] };
  const nameOf = new Map((profiles ?? []).map((p) => [p.id, p.full_name ?? "Player"]));
  const players = (teamId: string): Player[] =>
    (squads.data ?? []).filter((s) => s.team_id === teamId).map((s) => ({ id: s.user_id, name: nameOf.get(s.user_id) ?? "Player" })).sort((a, b) => a.name.localeCompare(b.name));
  const teamName = (tid: string) => teamsRes.data?.find((x) => x.id === tid)?.name ?? "Team";
  const teams: Record<"a" | "b", TeamInfo> = {
    a: { id: m.team_a_id, name: teamName(m.team_a_id), players: players(m.team_a_id) },
    b: { id: m.team_b_id, name: teamName(m.team_b_id), players: players(m.team_b_id) },
  };
  const rules = (t.rules ?? {}) as { overs?: number; players_per_side?: number };

  return (
    <ResultForm
      tournamentId={t.id}
      matchId={m.id}
      sport={sport.data?.slug === "football" ? "football" : "cricket"}
      teams={teams}
      initial={stateFromSaved({
        match: { ...m, team_a_id: m.team_a_id, team_b_id: m.team_b_id, score_a: m.score_a as Record<string, unknown>, score_b: m.score_b as Record<string, unknown>, toss: m.toss as Record<string, unknown> | null },
        batting: bat.data ?? [], bowling: bowl.data ?? [], fielding: field.data ?? [], lineups: lines.data ?? [], events: events.data ?? [],
      })}
      updatedAt={m.updated_at}
      published={m.result_published_at !== null}
      overs={rules.overs ?? 20}
      playersPerSide={rules.players_per_side ?? 11}
      dateLabel={m.scheduled_at ? formatDateTime(m.scheduled_at) : "Date to be announced"}
    />
  );
}
