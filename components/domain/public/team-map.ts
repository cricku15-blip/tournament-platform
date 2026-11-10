export type TeamLite = { id: string | null; name: string | null; logo_url: string | null; slug?: string | null };
export type TeamMap = Record<string, TeamLite>;

export function teamMapFrom(teams: Array<{ id: string | null; name: string | null; logo_url: string | null; slug: string | null }>): TeamMap {
  const m: TeamMap = {};
  for (const t of teams) if (t.id) m[t.id] = t;
  return m;
}
