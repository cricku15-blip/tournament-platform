export type Format = "league" | "knockout" | "league_playoffs";
export type PlayoffStyle = "top2" | "top4" | "qualifier";

export interface MatchCountInput {
  format: Format;
  teams: number;
  legs: 1 | 2;
  playoffStyle?: PlayoffStyle | null;
  thirdPlace?: boolean;
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
  const league = i.format === "knockout" ? 0 : (n * (n - 1) * i.legs) / 2;
  let playoffs = 0;
  if (i.format === "league_playoffs") {
    playoffs = i.playoffStyle === "top2" ? 1 : i.playoffStyle === "qualifier" ? 4 : 3;
  }
  const knockout = i.format === "knockout" ? Math.max(0, n - 1) + (i.thirdPlace && n >= 4 ? 1 : 0) : 0;
  const perTeam =
    i.format === "knockout"
      ? `1 to ${Math.max(1, Math.ceil(Math.log2(Math.max(2, n))))}`
      : String((n - 1) * i.legs) + (i.format === "league_playoffs" ? " + playoffs" : "");
  return { league, playoffs: playoffs + knockout, total: league + playoffs + knockout, perTeam };
}

export function qualifyingTeams(style: PlayoffStyle | null | undefined): number {
  return style === "top2" ? 2 : 4;
}
