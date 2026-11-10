"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { rpc } from "@/lib/rpc";
import { rateLimit } from "@/lib/rate-limit";
import { revalidateTournament } from "@/lib/public/revalidate";

type Result = { ok: true } | { ok: false; error: string };
const uuid = z.string().uuid();
const username = z.string().trim().toLowerCase().regex(/^[a-z0-9_]{3,20}$/, "Enter a valid username (3 to 20 letters, numbers or underscores).");

async function run(tid: string, name: string, args: Record<string, unknown>): Promise<Result> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Please log in again." };
  const limit = await rateLimit(`access:${user.id}`, "invite");
  if (!limit.success) return { ok: false, error: "Too many attempts. Wait a moment." };
  // New in migration 0018; not in the generated types until `npm run db:types` is run after applying it.
  const r = await rpc(name as never, args as never, supabase);
  if (r.error) return { ok: false, error: r.error.message };
  revalidateTournament({ id: tid });
  revalidatePath(`/organizer/tournaments/${tid}`);
  return { ok: true };
}

export async function addAssistant(tid: string, raw: string): Promise<Result> {
  const u = username.safeParse(raw);
  if (!uuid.safeParse(tid).success || !u.success) return { ok: false, error: u.success ? "Bad request." : u.error.issues[0].message };
  return run(tid, "add_assistant", { p_tournament_id: tid, p_username: u.data });
}

export async function removeAssistant(tid: string, userId: string): Promise<Result> {
  if (!uuid.safeParse(tid).success || !uuid.safeParse(userId).success) return { ok: false, error: "Bad request." };
  return run(tid, "remove_assistant", { p_tournament_id: tid, p_user_id: userId });
}

export async function transferTournament(tid: string, raw: string): Promise<Result> {
  const u = username.safeParse(raw);
  if (!uuid.safeParse(tid).success || !u.success) return { ok: false, error: u.success ? "Bad request." : u.error.issues[0].message };
  return run(tid, "transfer_tournament", { p_tournament_id: tid, p_username: u.data });
}
