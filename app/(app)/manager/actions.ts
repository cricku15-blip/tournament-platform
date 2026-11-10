"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { rateLimit } from "@/lib/rate-limit";
import { rpc } from "@/lib/rpc";
import { revalidateTournament } from "@/lib/public/revalidate";

type Result = { ok: true } | { ok: false; error: string; field?: string };
const uuid = z.string().uuid();

async function me() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

async function after(teamId: string) {
  const { supabase } = await me();
  const { data } = await supabase.from("teams").select("tournament_id").eq("id", teamId).maybeSingle();
  if (data) revalidateTournament({ id: data.tournament_id });
  revalidatePath(`/manager/teams/${teamId}`);
}

export interface Candidate {
  id: string;
  name: string;
  username: string | null;
  avatar_url: string | null;
}

/** Search registered players in the tournament's city who are not already in a squad. Service role only reads minimal fields. */
export async function searchPlayers(teamId: string, query: string): Promise<{ ok: true; players: Candidate[] } | { ok: false; error: string }> {
  const q = query.trim().slice(0, 40);
  if (!uuid.safeParse(teamId).success || q.length < 2) return { ok: true, players: [] };
  const { supabase, user } = await me();
  if (!user) return { ok: false, error: "Please log in again." };
  const limit = await rateLimit(`psearch:${user.id}`, "search");
  if (!limit.success) return { ok: false, error: "Searching too fast. Wait a moment." };

  // Caller must be able to read this team (RLS) and manage it.
  const { data: team } = await supabase.from("teams").select("id, manager_id, tournament_id").eq("id", teamId).maybeSingle();
  if (!team) return { ok: false, error: "Team not found." };
  const { data: t } = await supabase.from("tournaments").select("city_id, organizer_id").eq("id", team.tournament_id).maybeSingle();
  if (!t || (team.manager_id !== user.id && t.organizer_id !== user.id)) return { ok: false, error: "You can't manage this team." };

  const admin = createAdminClient();
  const like = `%${q.replace(/[\\%_,()"]/g, " ")}%`;
  const { data: found } = await admin
    .from("profiles")
    .select("id, full_name, username, avatar_url")
    .eq("city_id", t.city_id)
    .eq("status", "active")
    .not("onboarded_at", "is", null)
    .or(`full_name.ilike.${like},username.ilike.${like}`)
    .limit(12);
  const ids = (found ?? []).map((p) => p.id);
  if (ids.length === 0) return { ok: true, players: [] };
  const { data: taken } = await admin.from("squad_members").select("user_id").eq("tournament_id", team.tournament_id).in("user_id", ids);
  const takenSet = new Set((taken ?? []).map((x) => x.user_id));
  return { ok: true, players: (found ?? []).filter((p) => !takenSet.has(p.id)).map((p) => ({ id: p.id, name: p.full_name ?? p.username ?? "Player", username: p.username, avatar_url: p.avatar_url })) };
}

export async function addPlayer(teamId: string, userId: string): Promise<Result> {
  if (!uuid.safeParse(teamId).success || !uuid.safeParse(userId).success) return { ok: false, error: "Bad request." };
  const { supabase } = await me();
  const r = await rpc("add_squad_player", { p_team_id: teamId, p_user_id: userId }, supabase);
  if (r.error) return { ok: false, error: r.error.message };
  await after(teamId);
  return { ok: true };
}

export async function removePlayer(teamId: string, memberId: string): Promise<Result> {
  if (!uuid.safeParse(memberId).success) return { ok: false, error: "Bad request." };
  const { supabase } = await me();
  const r = await rpc("remove_squad_player", { p_member_id: memberId }, supabase);
  if (r.error) return { ok: false, error: r.error.message };
  await after(teamId);
  return { ok: true };
}

export async function setJersey(teamId: string, memberId: string, jersey: number): Promise<Result> {
  const n = z.number().int().min(0).max(999).safeParse(jersey);
  if (!uuid.safeParse(memberId).success || !n.success) return { ok: false, error: "Jersey numbers are 0 to 999." };
  const { supabase } = await me();
  const r = await rpc("set_jersey_number", { p_member_id: memberId, p_jersey: n.data }, supabase);
  if (r.error) return { ok: false, error: r.error.message };
  await after(teamId);
  return { ok: true };
}

export async function lockSquad(teamId: string, lock: boolean): Promise<Result> {
  if (!uuid.safeParse(teamId).success) return { ok: false, error: "Bad request." };
  const { supabase } = await me();
  const r = await rpc("set_squad_lock", { p_team_id: teamId, p_lock: lock }, supabase);
  if (r.error) return { ok: false, error: r.error.message };
  await after(teamId);
  return { ok: true };
}

const hex = z.string().regex(/^#[0-9a-fA-F]{6}$/, "Pick a valid colour.").or(z.literal(""));
const profileSchema = z.object({
  name: z.string().trim().min(2, "Team name is too short.").max(50),
  logoUrl: z.string().url().nullable(),
  colorPrimary: hex,
  colorSecondary: hex,
  description: z.string().max(500, "Up to 500 characters.").default(""),
  homeGround: z.string().trim().max(80).default(""),
});

export async function updateTeamProfile(teamId: string, input: unknown): Promise<Result> {
  const p = profileSchema.safeParse(input);
  if (!uuid.safeParse(teamId).success || !p.success) return { ok: false, error: p.success ? "Bad request." : p.error.issues[0].message, field: p.success ? undefined : String(p.error.issues[0].path[0]) };
  const { supabase } = await me();
  const v = p.data;
  const { error } = await supabase
    .from("teams")
    .update({ name: v.name, logo_url: v.logoUrl, color_primary: v.colorPrimary || null, color_secondary: v.colorSecondary || null, description: v.description || null, home_ground: v.homeGround || null })
    .eq("id", teamId);
  if (error) {
    if (error.message.includes("team_name_locked")) return { ok: false, error: "The team name can't be changed after registration closes.", field: "name" };
    if (error.code === "23505") return { ok: false, error: "A team with that name already exists.", field: "name" };
    return { ok: false, error: "Couldn't save the team profile." };
  }
  await after(teamId);
  return { ok: true };
}
