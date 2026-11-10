"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { callEdge } from "@/lib/payments/edge";
import { rpc } from "@/lib/rpc";
import { getErrorMessage } from "@/lib/errors";
import { rateLimit } from "@/lib/rate-limit";
import { revalidateTournament } from "@/lib/public/revalidate";
import { resultSchema, type ResultPayload } from "@/lib/results/schema";
import type { Json } from "@/types/supabase";
import { canOrganize } from "@/lib/organizer/access";

type Result<T = object> = ({ ok: true } & T) | { ok: false; error: string; field?: string };
const uuid = z.string().uuid();

async function ctx(tournamentId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: t } = await supabase.from("tournaments").select("id, slug, name, organizer_id").eq("id", tournamentId).maybeSingle();
  return { supabase, user, t };
}

function done(id: string, slug?: string) {
  revalidateTournament({ id, slug });
  revalidatePath(`/organizer/tournaments/${id}`);
}

/* ---------------- fixtures ---------------- */

const genSchema = z.object({
  action: z.enum(["generate", "playoffs"]),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  matchesPerDay: z.number().int().min(1).max(6).optional(),
  times: z.array(z.string().regex(/^\d{2}:\d{2}$/)).max(6).optional(),
  venues: z.array(z.string().trim().min(1).max(80)).max(6).optional(),
  manualOrder: z.array(uuid).max(64).optional(),
});

export async function generateFixtures(tournamentId: string, input: unknown): Promise<Result<{ matches: number }>> {
  const p = genSchema.safeParse(input);
  if (!uuid.safeParse(tournamentId).success || !p.success) return { ok: false, error: p.success ? "Bad request." : p.error.issues[0].message };
  const { supabase, user, t } = await ctx(tournamentId);
  if (!user || !t || !(await canOrganize(supabase, tournamentId, user.id, t.organizer_id))) return { ok: false, error: getErrorMessage("forbidden") };
  const limit = await rateLimit(`fixtures:${user.id}`, { max: 6, windowSeconds: 60 });
  if (!limit.success) return { ok: false, error: getErrorMessage("rate_limited") };
  const v = p.data;
  const r = await callEdge<{ ok: boolean; matches: number }>("generate-fixtures", {
    tournament_id: tournamentId,
    action: v.action,
    options: { start_date: v.startDate, matches_per_day: v.matchesPerDay, times: v.times, venues: v.venues, manual_order: v.manualOrder },
  });
  if (!r.ok) return { ok: false, error: getErrorMessage(r.error) };
  done(tournamentId, t.slug);
  return { ok: true, matches: r.data.matches };
}

const editSchema = z.object({
  scheduledAt: z.string().max(40).nullable().optional(),
  venue: z.string().trim().max(100).nullable().optional(),
  status: z.enum(["scheduled", "postponed", "cancelled"]).optional(),
  reason: z.string().trim().max(200).optional(),
  teamAId: uuid.nullable().optional(),
  teamBId: uuid.nullable().optional(),
});

export async function updateMatch(tournamentId: string, matchId: string, input: unknown): Promise<Result> {
  const p = editSchema.safeParse(input);
  if (!uuid.safeParse(matchId).success || !p.success) return { ok: false, error: "Bad request." };
  const v = p.data;
  const { supabase, user, t } = await ctx(tournamentId);
  if (!user || !t || !(await canOrganize(supabase, tournamentId, user.id, t.organizer_id))) return { ok: false, error: getErrorMessage("forbidden") };
  const { data: m } = await supabase.from("matches").select("id, status, result_published_at, team_a_id, team_b_id").eq("id", matchId).eq("tournament_id", tournamentId).maybeSingle();
  if (!m) return { ok: false, error: getErrorMessage("not_found") };
  if ((v.status === "postponed" || v.status === "cancelled") && !v.reason) return { ok: false, error: "Give a reason for postponing or cancelling." };
  const swapping = (v.teamAId !== undefined && v.teamAId !== m.team_a_id) || (v.teamBId !== undefined && v.teamBId !== m.team_b_id);
  if (swapping && (m.result_published_at || m.status === "live" || m.status === "completed")) return { ok: false, error: "Teams can only be changed before the match starts." };
  if (swapping && v.teamAId && v.teamAId === (v.teamBId ?? m.team_b_id)) return { ok: false, error: "A team can't play itself." };

  const patch: Record<string, unknown> = {};
  if (v.scheduledAt !== undefined) patch.scheduled_at = v.scheduledAt ? new Date(v.scheduledAt).toISOString() : null;
  if (v.venue !== undefined) patch.venue = v.venue || null;
  if (v.status) patch.status = v.status;
  if (v.reason) patch.notes = v.reason;
  if (v.teamAId !== undefined) patch.team_a_id = v.teamAId;
  if (v.teamBId !== undefined) patch.team_b_id = v.teamBId;
  const { error } = await supabase.from("matches").update(patch as never).eq("id", matchId);
  if (error) return { ok: false, error: "Couldn't save the match." };
  done(tournamentId, t.slug);
  return { ok: true };
}

export async function setFixturesPublished(tournamentId: string, matchIds: string[] | "all", published: boolean): Promise<Result> {
  const { supabase, user, t } = await ctx(tournamentId);
  if (!user || !t || !(await canOrganize(supabase, tournamentId, user.id, t.organizer_id))) return { ok: false, error: getErrorMessage("forbidden") };
  if (matchIds !== "all" && !z.array(uuid).max(300).safeParse(matchIds).success) return { ok: false, error: "Bad request." };
  let q = supabase.from("matches").update({ fixture_published: published }).eq("tournament_id", tournamentId);
  if (matchIds !== "all") q = q.in("id", matchIds);
  if (!published) q = q.is("result_published_at", null); // never hide a match that already has a public result
  const { error } = await q;
  if (error) return { ok: false, error: "Couldn't update fixtures." };
  if (published) {
    await rpc("post_announcement", { p_tid: tournamentId, p_title: "Fixtures published", p_body: `The match schedule for ${t.name} is now live. Check the Fixtures tab.`, p_pin: false }, supabase);
  }
  done(tournamentId, t.slug);
  return { ok: true };
}

export async function setMatchLive(tournamentId: string, matchId: string): Promise<Result> {
  if (!uuid.safeParse(matchId).success) return { ok: false, error: "Bad request." };
  const { supabase, t } = await ctx(tournamentId);
  const r = await rpc("set_match_live", { p_match_id: matchId }, supabase);
  if (r.error) return { ok: false, error: r.error.message };
  done(tournamentId, t?.slug);
  return { ok: true };
}

/* ---------------- results ---------------- */

async function writeStats(supabase: Awaited<ReturnType<typeof createClient>>, v: ResultPayload) {
  const id = v.matchId;
  const sync = async (table: "cricket_batting" | "cricket_bowling" | "cricket_fielding" | "football_lineups", rows: Array<Record<string, unknown> & { player_id: string }>, conflict: string) => {
    const keep = rows.map((r) => r.player_id);
    const del = supabase.from(table).delete().eq("match_id", id);
    const { error: e1 } = keep.length ? await del.not("player_id", "in", `(${keep.join(",")})`) : await del;
    if (e1) throw e1;
    if (rows.length) {
      const { error: e2 } = await supabase.from(table).upsert(rows as never, { onConflict: conflict });
      if (e2) throw e2;
    }
  };
  if (v.sport === "cricket") {
    await sync("cricket_batting", v.batting.map((r) => ({ match_id: id, innings: r.innings, team_id: r.teamId, player_id: r.playerId, runs: r.runs, balls: r.balls, fours: r.fours, sixes: r.sixes, dismissal: r.dismissal ?? null, bowler_id: r.bowlerId ?? null, fielder_id: r.fielderId ?? null })), "match_id,innings,player_id");
    await sync("cricket_bowling", v.bowling.map((r) => ({ match_id: id, innings: r.innings, team_id: r.teamId, player_id: r.playerId, balls_bowled: r.ballsBowled, maidens: r.maidens, runs: r.runs, wickets: r.wickets, wides: r.wides, no_balls: r.noBalls })), "match_id,innings,player_id");
    await sync("cricket_fielding", v.fielding.map((r) => ({ match_id: id, player_id: r.playerId, catches: r.catches, run_outs: r.runOuts, stumpings: r.stumpings })), "match_id,player_id");
  } else {
    await sync("football_lineups", v.lineups.map((r) => ({ match_id: id, team_id: r.teamId, player_id: r.playerId, is_starter: r.isStarter, position: r.position ?? null })), "match_id,player_id");
    // Events have no natural key, so they are replaced as a set.
    await supabase.from("football_events").delete().eq("match_id", id);
    if (v.events.length) {
      const { error } = await supabase.from("football_events").insert(v.events.map((e) => ({ match_id: id, type: e.type, team_id: e.teamId ?? null, player_id: e.playerId ?? null, assist_player_id: e.assistId ?? null, minute: e.minute ?? null })));
      if (error) throw error;
    }
  }
}

export async function saveResult(tournamentId: string, input: unknown, expectedUpdatedAt: string | null, publish: boolean): Promise<Result<{ updatedAt: string }>> {
  const p = resultSchema.safeParse(input);
  if (!p.success) return { ok: false, error: p.error.issues[0].message, field: String(p.error.issues[0].path[0] ?? "") };
  const v = p.data;
  const { supabase, user, t } = await ctx(tournamentId);
  if (!user || !t || !(await canOrganize(supabase, tournamentId, user.id, t.organizer_id))) return { ok: false, error: getErrorMessage("forbidden") };
  const { data: m } = await supabase.from("matches").select("id, updated_at, team_a_id, team_b_id").eq("id", v.matchId).eq("tournament_id", tournamentId).maybeSingle();
  if (!m) return { ok: false, error: getErrorMessage("not_found") };
  if (!m.team_a_id || !m.team_b_id) return { ok: false, error: getErrorMessage("teams_not_set") };
  if (expectedUpdatedAt && m.updated_at !== expectedUpdatedAt) return { ok: false, error: getErrorMessage("stale_result") };
  if (v.winnerTeamId && v.winnerTeamId !== m.team_a_id && v.winnerTeamId !== m.team_b_id) return { ok: false, error: "The winner must be one of the two teams.", field: "winnerTeamId" };

  try {
    await writeStats(supabase, v);
    const { error } = await supabase
      .from("matches")
      .update({
        result_type: v.resultType, winner_team_id: v.resultType === "win" || v.resultType === "walkover" ? v.winnerTeamId ?? null : null,
        result_text: v.resultText || null, player_of_match_id: v.pomId ?? null, notes: v.notes || null,
        score_a: v.scoreA as unknown as NonNullable<Json>, score_b: v.scoreB as unknown as NonNullable<Json>, toss: (v.toss ?? null) as unknown as Json,
      })
      .eq("id", v.matchId);
    if (error) throw error;
  } catch {
    return { ok: false, error: "Couldn't save the result. Please try again." };
  }

  if (publish) {
    const r = await rpc("publish_match_result", { p_match_id: v.matchId }, supabase);
    if (r.error) return { ok: false, error: r.error.message };
    // Public player pages cache career stats per username; refresh everyone involved.
    const ids = [...new Set([...v.batting, ...v.bowling, ...v.fielding, ...v.lineups, ...v.events].flatMap((x) => [("playerId" in x ? x.playerId : null) ?? null].filter(Boolean) as string[]))];
    const { data: profs } = ids.length ? await supabase.from("public_profiles").select("username").in("id", ids) : { data: [] };
    revalidateTournament({ id: tournamentId, slug: t.slug, playerUsernames: (profs ?? []).map((p) => p.username).filter((u): u is string => !!u) });
    revalidatePath(`/organizer/tournaments/${tournamentId}`);
  }
  const { data: fresh } = await supabase.from("matches").select("updated_at").eq("id", v.matchId).single();
  return { ok: true, updatedAt: fresh?.updated_at ?? new Date().toISOString() };
}
