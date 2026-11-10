export type Format = "league" | "knockout" | "league_playoffs" | "groups_knockout";
export type PlayoffStyle = "top2_final" | "top4_semis" | "qualifier_style" | "top8_quarters";

export interface MatchCountInput {
  format: Format;
  teams: number;
  legs: 1 | 2;
  playoffStyle?: PlayoffStyle | null;
  thirdPlace?: boolean;
  groupCount?: number | null;
  advancePerGroup?: number | null;
}

export interface MatchCount {
  league: number;
  playoffs: number;
  total: number;
  perTeam: string;
}

/** Live "Total matches" figure shown in the wizard. Mirrors the generate-fixtures Edge Function. */
export function countMatches(i: MatchCountInput): MatchCount {
  const n = Math.max(0, Math.floor(i.teams));
  let league = i.format === "knockout" ? 0 : (n * (n - 1) * i.legs) / 2;
  if (i.format === "groups_knockout") {
    const g = Math.max(2, i.groupCount ?? 2);
    // Snake split: group sizes differ by at most one.
    const base = Math.floor(n / g), extra = n % g;
    league = 0;
    for (let k = 0; k < g; k++) { const s = base + (k < extra ? 1 : 0); league += (s * (s - 1) * i.legs) / 2; }
  }
  let playoffs = 0;
  if (i.format === "league_playoffs") {
    playoffs = i.playoffStyle === "top2_final" ? 1 : i.playoffStyle === "qualifier_style" ? 4 : i.playoffStyle === "top8_quarters" ? 7 : 3;
  }
  if (i.format === "groups_knockout") {
    const q = Math.max(2, (i.groupCount ?? 2) * (i.advancePerGroup === 1 ? 1 : 2));
    playoffs = q - 1 + (i.thirdPlace && q >= 4 ? 1 : 0);
  }
  const knockout = i.format === "knockout" ? Math.max(0, n - 1) + (i.thirdPlace && n >= 4 ? 1 : 0) : 0;
  const perTeam =
    i.format === "groups_knockout"
      ? "group games + knockout"
      : i.format === "knockout"
      ? `1 to ${Math.max(1, Math.ceil(Math.log2(Math.max(2, n))))}`
      : String((n - 1) * i.legs) + (i.format === "league_playoffs" ? " + playoffs" : "");
  return { league, playoffs: playoffs + knockout, total: league + playoffs + knockout, perTeam };
}

export function qualifyingTeams(style: PlayoffStyle | null | undefined): number {
  return style === "top2_final" ? 2 : style === "top8_quarters" ? 8 : 4;
}
