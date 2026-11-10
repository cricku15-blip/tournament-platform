import { z } from "zod";

const slab = z.object({ key: z.string().min(1), label: z.string().min(1), overs: z.number().nullable().optional() });

/** Structure checks for sports.config. Extra keys are kept so older code keeps working. */
export const sportConfigSchema = z
  .object({
    squad: z.object({
      players_per_side_default: z.number().int().min(1).max(15),
      players_per_side_min: z.number().int().min(1).max(15),
      players_per_side_max: z.number().int().min(1).max(15),
      squad_max_limit: z.number().int().min(1).max(40),
    }),
    roles: z.array(z.string().min(1).max(30)).min(1).max(12),
    profile_fields: z.array(z.object({ key: z.string().regex(/^[a-z0-9_]+$/), label: z.string().min(1), type: z.literal("select"), options: z.array(z.string().min(1)).min(1) })).default([]),
    match_formats: z.array(slab).optional(),
    points: z.record(z.string(), z.number().int().min(0).max(10)).optional(),
    tiebreakers: z.array(z.string()).min(1).optional(),
  })
  .passthrough()
  .superRefine((c, ctx) => {
    const s = c.squad;
    if (s.players_per_side_min > s.players_per_side_default || s.players_per_side_default > s.players_per_side_max) ctx.addIssue({ code: "custom", path: ["squad"], message: "Players per side must satisfy min <= default <= max." });
  });

export function validateSportConfig(v: unknown): { ok: true; config: z.infer<typeof sportConfigSchema> } | { ok: false; error: string } {
  const r = sportConfigSchema.safeParse(v);
  return r.success ? { ok: true, config: r.data } : { ok: false, error: `${r.error.issues[0].path.join(".") || "config"}: ${r.error.issues[0].message}` };
}
