"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { rpc } from "@/lib/rpc";

const hex = z.string().regex(/^#[0-9a-fA-F]{6}$/, "Pick a valid colour.").or(z.literal(""));
const schema = z.object({
  tournamentId: z.string().uuid(),
  name: z.string().trim().min(2, "Team name is too short.").max(50, "Team name can be up to 50 characters."),
  logoUrl: z.string().url().nullable().optional(),
  colorPrimary: hex,
  colorSecondary: hex,
  homeGround: z.string().trim().max(80).default(""),
  phone: z.string().trim().regex(/^(\+91[\s-]?)?[6-9]\d{9}$/, "Enter a valid 10-digit mobile number.").or(z.literal("")),
  expectedSquad: z.number().int().min(1).max(40).nullable().optional(),
  notes: z.string().max(300, "Notes can be up to 300 characters.").default(""),
  paymentsAck: z.literal(true, { message: "Please confirm that payments happen outside this platform." }),
});

export async function applyWithTeam(input: unknown): Promise<{ ok: true } | { ok: false; error: string; field?: string }> {
  const p = schema.safeParse(input);
  if (!p.success) return { ok: false, error: p.error.issues[0].message, field: String(p.error.issues[0].path[0] ?? "") };
  const v = p.data;
  const supabase = await createClient();
  const r = await rpc(
    "apply_with_team",
    {
      p_tournament_id: v.tournamentId, p_name: v.name, p_logo_url: v.logoUrl ?? undefined, p_color_primary: v.colorPrimary || undefined,
      p_color_secondary: v.colorSecondary || undefined, p_home_ground: v.homeGround || undefined, p_manager_phone: v.phone || undefined,
      p_expected_squad_size: v.expectedSquad ?? undefined, p_notes: v.notes || undefined,
    },
    supabase
  );
  if (r.error) return { ok: false, error: r.error.message };
  revalidatePath("/manager/teams");
  return { ok: true };
}
