"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { rpc } from "@/lib/rpc";
import { rateLimit } from "@/lib/rate-limit";
import { revalidateTournament } from "@/lib/public/revalidate";
import {
  auctionSchema,
  basicsSchema,
  formatSchema,
  prizesSchema,
  registrationSchema,
  rulesSchemaFor,
  slugSchema,
  slugSuggestions,
  squadSchema,
  validateSlabs,
  type AuctionInput,
} from "@/lib/organizer/schemas";
import type { Json } from "@/types/supabase";

export type ActionResult<T = object> = ({ ok: true } & T) | { ok: false; error: string; field?: string };

const uuid = z.string().uuid();

async function me() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

function issue(e: z.ZodError): { ok: false; error: string; field: string } {
  return { ok: false, error: e.issues[0].message, field: String(e.issues[0].path[0] ?? "") };
}

function dbError(code: string | undefined, message: string): string {
  if (message.startsWith("locked_field")) return "That field can't be changed after payment.";
  if (message === "no_pricing_tier_for_team_count") return "No pricing tier covers that number of teams.";
  if (code === "23505") return "That link name is already taken. Pick another.";
  return "Couldn't save. Please try again.";
}

/* ---------------- slug ---------------- */

export async function checkSlug(raw: string, excludeId?: string): Promise<{ available: boolean; reason?: string; suggestions?: string[] }> {
  const parsed = slugSchema.safeParse(raw);
  if (!parsed.success) return { available: false, reason: parsed.error.issues[0].message };
  const { user } = await me();
  if (!user) return { available: false, reason: "Please log in again." };
  const limit = await rateLimit(`slug:${user.id}`, "search");
  if (!limit.success) return { available: false, reason: "Checking too fast. Wait a moment." };
  // Service role only to learn whether ANY tournament (including other people's drafts) uses the slug. Returns a boolean, never rows.
  const admin = createAdminClient();
  const [t, r] = await Promise.all([
    admin.from("tournaments").select("id").eq("slug", parsed.data).maybeSingle(),
    admin.from("slug_redirects").select("tournament_id").eq("old_slug", parsed.data).maybeSingle(),
  ]);
  const taken = (t.data && t.data.id !== excludeId) || r.data;
  return taken ? { available: false, reason: "That link name is taken.", suggestions: slugSuggestions(parsed.data) } : { available: true };
}

/* ---------------- draft save (one action per step) ---------------- */

type StepValues = Record<string, unknown>;

export async function saveDraft(id: string | null, step: number, values: StepValues, sportSlug: string): Promise<ActionResult<{ id: string; savedAt: string }>> {
  const { supabase, user } = await me();
  if (!user) return { ok: false, error: "Please log in again." };
  const now = new Date().toISOString();

  // Columns for this step (only these are written, so steps never overwrite each other).
  let cols: Record<string, unknown> | null = null;

  if (step === 1) {
    const p = basicsSchema.safeParse(values);
    if (!p.success) return issue(p.error);
    const v = p.data;
    cols = {
      name: v.name, slug: v.slug, sport_id: v.sportId, city_id: v.cityId, venue_name: v.venueName,
      venue_address: v.venueAddress || null, start_date: v.startDate, end_date: v.endDate,
      banner_url: v.bannerUrl ?? null, logo_url: v.logoUrl ?? null,
      description_short: v.descriptionShort, description_full: v.descriptionFull || null,
    };
  } else if (step === 2) {
    const p = formatSchema.safeParse(values);
    if (!p.success) return issue(p.error);
    const v = p.data;
    cols = { format: v.format, team_count: v.teamCount, league_legs: v.leagueLegs, playoff_style: v.format === "league_playoffs" ? v.playoffStyle : null, third_place_match: v.thirdPlaceMatch, seeding_method: v.seedingMethod, group_count: v.format === "groups_knockout" ? v.groupCount : null, advance_per_group: v.format === "groups_knockout" ? v.advancePerGroup : null } as never;
  } else if (step === 3) {
    const p = rulesSchemaFor(sportSlug).safeParse(values);
    if (!p.success) return issue(p.error);
    cols = { rules: p.data as unknown as NonNullable<Json> };
  } else if (step === 4) {
    const p = squadSchema.safeParse(values);
    if (!p.success) return issue(p.error);
    const v = p.data;
    cols = { squad_mode: v.squadMode, squad_min: v.squadMin, squad_max: v.squadMax, player_pool_cap: v.playerPoolCap ?? null, squad_lock_deadline: v.squadLockDeadline || null, allow_player_applications: v.allowPlayerApplications };
  } else if (step === 5) {
    const p = registrationSchema.safeParse(values);
    if (!p.success) return issue(p.error);
    const v = p.data;
    cols = { team_entry: v.teamEntry, team_deadline: v.teamDeadline || null, player_deadline: v.playerDeadline || null, custom_questions: v.customQuestions as unknown as NonNullable<Json>, visibility: v.visibility, show_contact: v.showContact, contact_phone: v.contactPhone || null, contact_email: v.contactEmail || null, entry_fee_info: v.entryFeeInfo || null };
  } else if (step === 6) {
    const p = prizesSchema.safeParse(values);
    if (!p.success) return issue(p.error);
    const v = p.data;
    cols = { prizes: [...(v.prizePoolText ? [{ type: "pool", text: v.prizePoolText }] : []), ...v.prizes.map((x) => ({ type: "position", ...x }))] as unknown as NonNullable<Json>, individual_awards: v.awards, rules_text: v.rulesText || null };
  } else {
    return { ok: false, error: "Unknown step." };
  }

  if (!id) {
    if (step !== 1) return { ok: false, error: "Start with the basics first." };
    const { data, error } = await supabase
      .from("tournaments")
      .insert({ ...(cols as object), organizer_id: user.id } as never)
      .select("id")
      .single();
    if (error) return { ok: false, error: dbError(error.code, error.message), field: error.code === "23505" ? "slug" : undefined };
    revalidatePath("/organizer/tournaments");
    return { ok: true, id: data.id, savedAt: now };
  }

  if (!uuid.safeParse(id).success) return { ok: false, error: "Bad request." };
  const { error } = await supabase.from("tournaments").update(cols as never).eq("id", id);
  if (error) return { ok: false, error: dbError(error.code, error.message), field: error.code === "23505" ? "slug" : undefined };
  revalidateTournament({ id });
  return { ok: true, id, savedAt: now };
}

export async function saveAuctionSettings(tournamentId: string, input: AuctionInput): Promise<ActionResult> {
  const { supabase, user } = await me();
  if (!user) return { ok: false, error: "Please log in again." };
  if (!uuid.safeParse(tournamentId).success) return { ok: false, error: "Bad request." };
  const p = auctionSchema.safeParse(input);
  if (!p.success) return issue(p.error);
  const slabError = validateSlabs(p.data.incrementSlabs);
  if (slabError) return { ok: false, error: slabError, field: "incrementSlabs" };
  const v = p.data;
  const { error } = await supabase.from("auction_settings").upsert({
    tournament_id: tournamentId, mode: v.mode, purse: v.purse, categories: v.categories as unknown as NonNullable<Json>,
    base_prices: v.basePrices as unknown as NonNullable<Json>, increment_slabs: v.incrementSlabs as unknown as NonNullable<Json>,
    reserve_rule: v.reserveRule, category_limits: v.categoryLimits as unknown as NonNullable<Json>,
    sequence_mode: v.sequenceMode, scheduled_at: v.scheduledAt || null,
  });
  if (error) return { ok: false, error: "Couldn't save the auction settings." };
  revalidateTournament({ id: tournamentId });
  return { ok: true };
}

/* ---------------- list actions ---------------- */

export async function duplicateTournament(id: string): Promise<ActionResult<{ id: string }>> {
  const { supabase, user } = await me();
  if (!user || !uuid.safeParse(id).success) return { ok: false, error: "Please log in again." };
  const { data: t } = await supabase.from("tournaments").select("*").eq("id", id).maybeSingle();
  if (!t || t.organizer_id !== user.id) return { ok: false, error: "Tournament not found." };

  const suffix = Math.random().toString(36).slice(2, 6);
  const nn = <T,>(v: T | null, fallback: NonNullable<unknown>) => (v ?? fallback) as never;
  const copy = {
    organizer_id: user.id, name: `${t.name} (copy)`.slice(0, 80), slug: `${t.slug}-${suffix}`.slice(0, 60),
    sport_id: t.sport_id, city_id: t.city_id, venue_name: t.venue_name, venue_address: t.venue_address,
    format: t.format, team_count: t.team_count, league_legs: t.league_legs, playoff_style: t.playoff_style, group_count: t.group_count, advance_per_group: t.advance_per_group,
    third_place_match: t.third_place_match, seeding_method: t.seeding_method, rules: nn(t.rules, {}),
    squad_mode: t.squad_mode, squad_min: t.squad_min, squad_max: t.squad_max, player_pool_cap: t.player_pool_cap,
    team_entry: t.team_entry, allow_player_applications: t.allow_player_applications, custom_questions: nn(t.custom_questions, []),
    visibility: t.visibility, show_contact: t.show_contact, contact_phone: t.contact_phone, contact_email: t.contact_email,
    entry_fee_info: t.entry_fee_info, prizes: nn(t.prizes, []), individual_awards: t.individual_awards, rules_text: t.rules_text,
    description_short: t.description_short, description_full: t.description_full, banner_url: t.banner_url, logo_url: t.logo_url,
  };
  const { data: created, error } = await supabase.from("tournaments").insert(copy).select("id").single();
  if (error) return { ok: false, error: dbError(error.code, error.message) };

  if (t.squad_mode === "auction") {
    const { data: a } = await supabase.from("auction_settings").select("mode, purse, categories, base_prices, increment_slabs, reserve_rule, category_limits, sequence_mode").eq("tournament_id", id).maybeSingle();
    if (a) await supabase.from("auction_settings").insert({ mode: a.mode, purse: a.purse, categories: nn(a.categories, []), base_prices: nn(a.base_prices, {}), increment_slabs: nn(a.increment_slabs, []), reserve_rule: a.reserve_rule, category_limits: nn(a.category_limits, {}), sequence_mode: a.sequence_mode, tournament_id: created.id });
  }
  revalidatePath("/organizer/tournaments");
  return { ok: true, id: created.id };
}

export async function deleteDraft(id: string): Promise<ActionResult> {
  const { supabase, user } = await me();
  if (!user || !uuid.safeParse(id).success) return { ok: false, error: "Please log in again." };
  const { data: t } = await supabase.from("tournaments").select("status, organizer_id").eq("id", id).maybeSingle();
  if (!t || t.organizer_id !== user.id) return { ok: false, error: "Tournament not found." };
  if (t.status !== "draft") return { ok: false, error: "Only drafts can be deleted. Cancel the tournament instead." };
  const { error } = await supabase.from("tournaments").delete().eq("id", id).eq("status", "draft");
  if (error) return { ok: false, error: "Couldn't delete the draft." };
  revalidatePath("/organizer/tournaments");
  return { ok: true };
}

/* ---------------- manager actions (thin wrappers over RPCs) ---------------- */

async function slugOf(id: string) {
  const { supabase } = await me();
  const { data } = await supabase.from("tournaments").select("slug").eq("id", id).maybeSingle();
  return data?.slug;
}

const STATUS_RPC = {
  publish: "publish_tournament",
  close: "close_registration",
  reopen: "reopen_registration",
  lockPool: "lock_pool",
  lockSquads: "lock_squads",
  goLive: "go_live",
  complete: "complete_tournament",
} as const;

export async function changeStatus(id: string, action: keyof typeof STATUS_RPC): Promise<ActionResult> {
  if (!uuid.safeParse(id).success || !(action in STATUS_RPC)) return { ok: false, error: "Bad request." };
  const { supabase } = await me();
  const name = STATUS_RPC[action];
  const r = name === "publish_tournament" ? await rpc(name, { p_tournament_id: id }, supabase) : await rpc(name, { p_tid: id }, supabase);
  if (r.error) return { ok: false, error: r.error.message };
  revalidateTournament({ id, slug: await slugOf(id) });
  revalidatePath(`/organizer/tournaments/${id}`);
  return { ok: true };
}

export async function cancelTournament(id: string, reason: string): Promise<ActionResult> {
  const r = z.string().trim().min(3, "Give a reason.").max(300).safeParse(reason);
  if (!uuid.safeParse(id).success || !r.success) return { ok: false, error: r.success ? "Bad request." : r.error.issues[0].message };
  const { supabase } = await me();
  const res = await rpc("cancel_tournament", { p_tournament_id: id, p_reason: r.data }, supabase);
  if (res.error) return { ok: false, error: res.error.message };
  revalidateTournament({ id, slug: await slugOf(id) });
  revalidatePath(`/organizer/tournaments/${id}`);
  return { ok: true };
}

export async function postAnnouncement(id: string, title: string, body: string, pin: boolean): Promise<ActionResult> {
  const p = z.object({ title: z.string().trim().min(2, "Add a title.").max(100), body: z.string().trim().min(2, "Write a message.").max(1000) }).safeParse({ title, body });
  if (!uuid.safeParse(id).success || !p.success) return { ok: false, error: p.success ? "Bad request." : p.error.issues[0].message };
  const { supabase } = await me();
  const res = await rpc("post_announcement", { p_tid: id, p_title: p.data.title, p_body: p.data.body, p_pin: pin }, supabase);
  if (res.error) return { ok: false, error: res.error.message };
  revalidateTournament({ id, slug: await slugOf(id) });
  revalidatePath(`/organizer/tournaments/${id}`);
  return { ok: true };
}

export async function addTeamSlot(id: string, name: string): Promise<ActionResult> {
  const p = z.string().trim().min(2, "Team name is too short.").max(50).safeParse(name);
  if (!uuid.safeParse(id).success || !p.success) return { ok: false, error: p.success ? "Bad request." : p.error.issues[0].message };
  const { supabase } = await me();
  const { count } = await supabase.from("teams").select("id", { count: "exact", head: true }).eq("tournament_id", id).neq("status", "rejected").neq("status", "withdrawn");
  const { data: t } = await supabase.from("tournaments").select("team_count").eq("id", id).maybeSingle();
  if (t && (count ?? 0) >= t.team_count) return { ok: false, error: "The tournament already has the maximum number of teams." };
  const slug = `${p.data.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "")}-${Math.random().toString(36).slice(2, 5)}`.slice(0, 60);
  const { error } = await supabase.from("teams").insert({ tournament_id: id, name: p.data, slug, status: "invited" });
  if (error) return { ok: false, error: error.code === "23505" ? "A team with that name already exists." : "Couldn't add the team." };
  revalidatePath(`/organizer/tournaments/${id}`);
  return { ok: true };
}

export async function inviteManager(teamId: string): Promise<ActionResult<{ code: string }>> {
  if (!uuid.safeParse(teamId).success) return { ok: false, error: "Bad request." };
  const { supabase, user } = await me();
  if (!user) return { ok: false, error: "Please log in again." };
  const limit = await rateLimit(`invite:${user.id}`, "invite");
  if (!limit.success) return { ok: false, error: "Too many invites. Wait a moment." };
  const r = await rpc("create_team_invite", { p_team_id: teamId }, supabase);
  if (r.error) return { ok: false, error: r.error.message };
  return { ok: true, code: String(r.data) };
}

export async function reviewTeam(tournamentId: string, teamId: string, decision: "approved" | "rejected", reason?: string): Promise<ActionResult> {
  if (!uuid.safeParse(teamId).success || !["approved", "rejected"].includes(decision)) return { ok: false, error: "Bad request." };
  const { supabase } = await me();
  const r = await rpc("review_team", { p_team_id: teamId, p_decision: decision, p_reason: reason?.slice(0, 200) }, supabase);
  if (r.error) return { ok: false, error: r.error.message };
  revalidateTournament({ id: tournamentId, slug: await slugOf(tournamentId) });
  revalidatePath(`/organizer/tournaments/${tournamentId}`);
  return { ok: true };
}

export async function removeTeam(tournamentId: string, teamId: string): Promise<ActionResult> {
  if (!uuid.safeParse(teamId).success) return { ok: false, error: "Bad request." };
  const { supabase } = await me();
  const { data: t } = await supabase.from("tournaments").select("status").eq("id", tournamentId).maybeSingle();
  if (t && !["draft", "paid", "registration_open"].includes(t.status)) return { ok: false, error: "Teams can't be removed after registration closes." };
  const { error } = await supabase.from("teams").delete().eq("id", teamId).eq("tournament_id", tournamentId);
  if (error) return { ok: false, error: "Couldn't remove the team." };
  revalidateTournament({ id: tournamentId, slug: await slugOf(tournamentId) });
  revalidatePath(`/organizer/tournaments/${tournamentId}`);
  return { ok: true };
}

export async function setTeamEntry(tournamentId: string, teamEntry: "invite" | "open" | "both"): Promise<ActionResult> {
  if (!uuid.safeParse(tournamentId).success || !["invite", "open", "both"].includes(teamEntry)) return { ok: false, error: "Bad request." };
  const { supabase } = await me();
  const { error } = await supabase.from("tournaments").update({ team_entry: teamEntry }).eq("id", tournamentId);
  if (error) return { ok: false, error: "Couldn't update." };
  revalidateTournament({ id: tournamentId, slug: await slugOf(tournamentId) });
  revalidatePath(`/organizer/tournaments/${tournamentId}`);
  return { ok: true };
}

export async function reviewApplication(tournamentId: string, applicationId: string, decision: "approved" | "rejected", reason?: string): Promise<ActionResult> {
  if (!uuid.safeParse(applicationId).success || !["approved", "rejected"].includes(decision)) return { ok: false, error: "Bad request." };
  const { supabase } = await me();
  const r = await rpc("review_application", { p_application_id: applicationId, p_decision: decision, p_reason: reason?.slice(0, 200) }, supabase);
  if (r.error) return { ok: false, error: r.error.message };
  revalidateTournament({ id: tournamentId, slug: await slugOf(tournamentId) });
  revalidatePath(`/organizer/tournaments/${tournamentId}`);
  return { ok: true };
}

export async function updatePoolPlayers(tournamentId: string, updates: Array<{ id: string; category?: string | null; base_price?: number; sequence_no?: number | null }>): Promise<ActionResult> {
  const p = z.array(z.object({ id: uuid, category: z.string().max(30).nullable().optional(), base_price: z.number().int().min(0).optional(), sequence_no: z.number().int().min(1).nullable().optional() })).max(500).safeParse(updates);
  if (!p.success || !uuid.safeParse(tournamentId).success) return { ok: false, error: "Bad request." };
  const { supabase } = await me();
  const { data: s } = await supabase.from("auction_settings").select("pool_locked").eq("tournament_id", tournamentId).maybeSingle();
  if (s?.pool_locked) return { ok: false, error: "The player pool is locked and cannot be modified." };
  for (const u of p.data) {
    const { id, ...rest } = u;
    const { error } = await supabase.from("pool_players").update(rest).eq("id", id).eq("tournament_id", tournamentId);
    if (error) return { ok: false, error: "Couldn't save the pool changes." };
  }
  revalidatePath(`/organizer/tournaments/${tournamentId}`);
  return { ok: true };
}

export async function setSequenceMode(tournamentId: string, mode: "random" | "category" | "manual"): Promise<ActionResult> {
  if (!uuid.safeParse(tournamentId).success || !["random", "category", "manual"].includes(mode)) return { ok: false, error: "Bad request." };
  const { supabase } = await me();
  const { error } = await supabase.from("auction_settings").update({ sequence_mode: mode }).eq("tournament_id", tournamentId);
  if (error) return { ok: false, error: "Couldn't update." };
  revalidatePath(`/organizer/tournaments/${tournamentId}`);
  return { ok: true };
}
