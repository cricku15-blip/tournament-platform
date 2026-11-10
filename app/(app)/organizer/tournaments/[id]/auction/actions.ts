"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { rpc } from "@/lib/rpc";
import { revalidateTournament } from "@/lib/public/revalidate";

type Result = { ok: true } | { ok: false; error: string };
const uuid = z.string().uuid();

function done(id: string) {
  revalidateTournament({ id });
  revalidatePath(`/organizer/tournaments/${id}`);
}

export async function scheduleAuction(tid: string, localOrIso: string): Promise<Result> {
  const d = new Date(localOrIso);
  if (!uuid.safeParse(tid).success || Number.isNaN(d.getTime())) return { ok: false, error: "Choose a valid date and time." };
  if (d.getTime() < Date.now() - 60_000) return { ok: false, error: "The auction time can't be in the past." };
  const supabase = await createClient();
  const r = await rpc("schedule_auction", { p_tid: tid, p_at: d.toISOString() }, supabase);
  if (r.error) return { ok: false, error: r.error.message };
  done(tid);
  return { ok: true };
}

export async function startAuction(tid: string): Promise<Result> {
  if (!uuid.safeParse(tid).success) return { ok: false, error: "Bad request." };
  const supabase = await createClient();
  const r = await rpc("start_auction", { p_tid: tid }, supabase);
  if (r.error) return { ok: false, error: r.error.message };
  done(tid);
  return { ok: true };
}

/** Simple mode: one database function applies the same purse, squad, category and reserve rules in a single transaction. */
export async function recordSimpleSale(tid: string, playerId: string, teamId: string, price: number): Promise<Result> {
  const p = z.object({ tid: uuid, playerId: uuid, teamId: uuid, price: z.number().int().min(1).max(10_000_000) }).safeParse({ tid, playerId, teamId, price });
  if (!p.success) return { ok: false, error: "Choose a player, a team and a whole-number price." };
  const supabase = await createClient();
  // record_simple_sale ships in migration 0016, which isn't in the generated types until it is applied and `npm run db:types` is run.
  const r = await rpc("record_simple_sale" as never, { p_tid: tid, p_player_id: playerId, p_team_id: teamId, p_price: price } as never, supabase);
  if (r.error) return { ok: false, error: r.error.message };
  done(tid);
  return { ok: true };
}
