"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { rateLimit } from "@/lib/rate-limit";
import { rpc } from "@/lib/rpc";

const code = z.string().regex(/^[A-Za-z0-9_-]{8,64}$/);

export type InviteSummary = { team: string; tournament: string; city: string; sport: string; organizer: string | null; expiresAt: string };

/** Service role lookup: returns a tiny summary for valid, pending invites and nothing at all otherwise. */
export async function lookupInvite(raw: string): Promise<InviteSummary | null> {
  const parsed = code.safeParse(raw);
  if (!parsed.success) return null;
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
  const limit = await rateLimit(`invite-lookup:${ip}`, "invite");
  if (!limit.success) return null;

  const admin = createAdminClient();
  const { data: inv } = await admin.from("team_invites").select("team_id, tournament_id, status, expires_at").eq("code", parsed.data).maybeSingle();
  if (!inv || inv.status !== "pending" || new Date(inv.expires_at) < new Date()) return null;
  const [team, t] = await Promise.all([
    admin.from("teams").select("name, manager_id").eq("id", inv.team_id).maybeSingle(),
    admin.from("tournaments").select("name, status, city_id, sport_id, organizer_id").eq("id", inv.tournament_id).maybeSingle(),
  ]);
  if (!team.data || team.data.manager_id || !t.data || ["completed", "cancelled"].includes(t.data.status)) return null;
  const [city, sport, org] = await Promise.all([
    admin.from("cities").select("name").eq("id", t.data.city_id).maybeSingle(),
    admin.from("sports").select("name").eq("id", t.data.sport_id).maybeSingle(),
    admin.from("public_profiles").select("full_name").eq("id", t.data.organizer_id).maybeSingle(),
  ]);
  return { team: team.data.name, tournament: t.data.name, city: city.data?.name ?? "", sport: sport.data?.name ?? "", organizer: org.data?.full_name ?? null, expiresAt: inv.expires_at };
}

export async function acceptInvite(raw: string): Promise<{ ok: true; teamId: string } | { ok: false; error: string }> {
  const parsed = code.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "This invite isn't valid anymore. Ask the organizer for a new one." };
  const supabase = await createClient();
  const r = await rpc("accept_team_invite", { p_code: parsed.data }, supabase);
  if (r.error) return { ok: false, error: r.error.message };
  revalidatePath("/", "layout");
  return { ok: true, teamId: String(r.data) };
}
