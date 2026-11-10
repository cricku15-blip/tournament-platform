"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { rpc } from "@/lib/rpc";
import { revalidateTournament } from "@/lib/public/revalidate";
import type { Json } from "@/types/supabase";

export type Result = { ok: true } | { ok: false; error: string };

const schema = z.object({
  tournamentId: z.string().uuid(),
  role: z.string().trim().min(1, "Choose your role.").max(40),
  experience: z.enum(["beginner", "intermediate", "advanced"], { message: "Choose your experience level." }),
  phone: z.string().trim().regex(/^(\+91[\s-]?)?[6-9]\d{9}$/, "Enter a valid 10-digit mobile number.").or(z.literal("")),
  available: z.literal(true, { message: "Confirm you are available for the dates." }),
  paymentsAck: z.literal(true, { message: "Please confirm that payments happen outside this platform." }),
  notes: z.string().max(300, "Notes can be up to 300 characters.").default(""),
  details: z.record(z.string(), z.string().max(60)).default({}),
  answers: z.record(z.string(), z.string().max(200)).default({}),
  requiredAnswers: z.array(z.string()).default([]),
});

export async function applyAsPlayer(input: unknown): Promise<Result & { field?: string }> {
  const p = schema.safeParse(input);
  if (!p.success) return { ok: false, error: p.error.issues[0].message, field: String(p.error.issues[0].path[0] ?? "") };
  const v = p.data;
  for (const key of v.requiredAnswers) {
    if (!v.answers[key]?.trim()) return { ok: false, error: "Please answer the required questions.", field: "answers" };
  }
  const supabase = await createClient();
  const r = await rpc(
    "apply_as_player",
    { p_tournament_id: v.tournamentId, p_role: v.role, p_experience: v.experience, p_contact_phone: v.phone || undefined, p_notes: v.notes || undefined, p_answers: v.answers as unknown as NonNullable<Json>, p_details: v.details as unknown as NonNullable<Json> },
    supabase
  );
  if (r.error) return { ok: false, error: r.error.message };
  revalidatePath("/player/applications");
  revalidateTournament({ id: v.tournamentId });
  return { ok: true };
}

export async function switchCity(cityId: string): Promise<Result> {
  if (!z.string().uuid().safeParse(cityId).success) return { ok: false, error: "Bad request." };
  const supabase = await createClient();
  const r = await rpc("change_city", { p_city_id: cityId }, supabase);
  if (r.error) return { ok: false, error: r.error.message };
  revalidatePath("/", "layout");
  return { ok: true };
}
