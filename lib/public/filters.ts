import { z } from "zod";

export const TOURNAMENT_STATUSES = ["registration_open", "registration_closed", "auction", "squads_locked", "live", "completed"] as const;

export const tournamentFilterSchema = z.object({
  sport: z.string().regex(/^[a-z0-9-]{1,30}$/).optional(),
  city: z.string().regex(/^[a-z0-9-]{1,40}$/).optional(),
  status: z.enum(TOURNAMENT_STATUSES).optional(),
  mode: z.enum(["direct", "auction"]).optional(),
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  q: z.string().trim().max(60).optional(),
  page: z.coerce.number().int().min(1).max(500).optional(),
});
export type TournamentFilters = z.infer<typeof tournamentFilterSchema>;

/** Parses untrusted URL params, dropping anything invalid instead of failing. */
export function parseFilters(raw: Record<string, string | string[] | undefined>): TournamentFilters {
  const flat: Record<string, string> = {};
  for (const [k, v] of Object.entries(raw)) {
    const val = Array.isArray(v) ? v[0] : v;
    if (val) flat[k] = val;
  }
  const out: Record<string, unknown> = {};
  for (const key of Object.keys(tournamentFilterSchema.shape)) {
    if (!(key in flat)) continue;
    const r = tournamentFilterSchema.shape[key as keyof typeof tournamentFilterSchema.shape].safeParse(flat[key]);
    if (r.success) out[key] = r.data;
  }
  return out as TournamentFilters;
}

/** Escapes `%`, `_` and PostgREST list separators so user text is only ever a literal substring. */
export function likePattern(q: string): string {
  return `%${q.replace(/[\\%_]/g, (c) => `\\${c}`).replace(/[,()"]/g, " ")}%`;
}

export function filtersToQuery(f: TournamentFilters, extra: Partial<TournamentFilters> = {}): string {
  const merged = { ...f, ...extra };
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(merged)) if (v !== undefined && v !== "") p.set(k, String(v));
  const s = p.toString();
  return s ? `?${s}` : "";
}
