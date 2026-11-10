export type Side = "a" | "b";

/** "13.4" overs -> 82 balls. Returns null for invalid input such as "13.7". */
export function oversToBalls(input: string | number): number | null {
  const s = String(input).trim();
  if (!/^\d+(\.\d)?$/.test(s)) return null;
  const [o, b = "0"] = s.split(".");
  if (Number(b) > 5) return null;
  return Number(o) * 6 + Number(b);
}

export function ballsToOvers(balls: number): string {
  return `${Math.floor(balls / 6)}.${balls % 6}`;
}

export const strikeRate = (runs: number, balls: number) => (balls > 0 ? Math.round((runs * 10000) / balls) / 100 : 0);
export const economy = (runs: number, balls: number) => (balls > 0 ? Math.round((runs * 600) / balls) / 100 : 0);

/** NRR uses the full quota of balls when a side was all out, otherwise the balls actually faced. */
export function nrrBalls(o: { wickets: number; balls: number; overs: number; playersPerSide: number }): number {
  return o.wickets >= o.playersPerSide - 1 ? o.overs * 6 : o.balls;
}

export interface CricketTotals {
  runs: number;
  wickets: number;
  balls: number;
}

export interface Suggestion {
  resultType: "win" | "tie";
  winner: Side | null;
  text: string;
}

/** Suggested result from the two innings. Organizers can override every part of it. */
export function suggestCricket(o: { battedFirst: Side; a: CricketTotals; b: CricketTotals; names: Record<Side, string>; playersPerSide: number }): Suggestion {
  const first = o.battedFirst;
  const second: Side = first === "a" ? "b" : "a";
  const f = o[first];
  const s = o[second];
  if (f.runs === s.runs) return { resultType: "tie", winner: null, text: "Match tied" };
  if (s.runs > f.runs) {
    const wk = Math.max(0, o.playersPerSide - 1 - s.wickets);
    return { resultType: "win", winner: second, text: `${o.names[second]} won by ${wk} wicket${wk === 1 ? "" : "s"}` };
  }
  const diff = f.runs - s.runs;
  return { resultType: "win", winner: first, text: `${o.names[first]} won by ${diff} run${diff === 1 ? "" : "s"}` };
}

export interface FootballScore {
  goals: number;
  pens?: number | null;
}

export function suggestFootball(o: { a: FootballScore; b: FootballScore; names: Record<Side, string> }): Suggestion {
  if (o.a.goals !== o.b.goals) {
    const w: Side = o.a.goals > o.b.goals ? "a" : "b";
    return { resultType: "win", winner: w, text: `${o.names[w]} won ${Math.max(o.a.goals, o.b.goals)}-${Math.min(o.a.goals, o.b.goals)}` };
  }
  if (o.a.pens != null && o.b.pens != null && o.a.pens !== o.b.pens) {
    const w: Side = o.a.pens > o.b.pens ? "a" : "b";
    return { resultType: "win", winner: w, text: `${o.names[w]} won ${Math.max(o.a.pens, o.b.pens)}-${Math.min(o.a.pens, o.b.pens)} on penalties` };
  }
  return { resultType: "tie", winner: null, text: `Draw ${o.a.goals}-${o.b.goals}` };
}

export interface CricketCheckInput {
  totals: Record<Side, { runs: number; wickets: number; extras: number }>;
  battedFirst: Side;
  batting: Array<{ innings: number; runs: number; dismissal: string | null }>;
  bowling: Array<{ innings: number; wickets: number; runs: number }>;
}

/** Completeness warnings. Each is a plain sentence; publishing is allowed with "confirm anyway". */
export function checkCricket(i: CricketCheckInput): string[] {
  const out: string[] = [];
  for (const innings of [1, 2]) {
    const side: Side = innings === 1 ? i.battedFirst : i.battedFirst === "a" ? "b" : "a";
    const t = i.totals[side];
    const bat = i.batting.filter((r) => r.innings === innings);
    const bowl = i.bowling.filter((r) => r.innings === innings);
    if (bat.length > 0) {
      const sum = bat.reduce((n, r) => n + r.runs, 0) + t.extras;
      if (sum !== t.runs) out.push(`Innings ${innings}: batters' runs plus extras make ${sum}, but the team total is ${t.runs}.`);
      const out_ = bat.filter((r) => r.dismissal && r.dismissal !== "Not out").length;
      if (out_ !== t.wickets && bowl.length === 0) out.push(`Innings ${innings}: ${out_} batters are out, but the total shows ${t.wickets} wickets.`);
    } else {
      out.push(`Innings ${innings}: no batting entries. Stats will be empty for this innings.`);
    }
    if (bowl.length > 0) {
      const w = bowl.reduce((n, r) => n + r.wickets, 0);
      if (w > t.wickets) out.push(`Innings ${innings}: bowlers' wickets (${w}) are more than the wickets in the total (${t.wickets}).`);
      const r = bowl.reduce((n, x) => n + x.runs, 0);
      if (r !== t.runs) out.push(`Innings ${innings}: runs conceded by bowlers (${r}) differ from the team total (${t.runs}).`);
    }
  }
  return out;
}

export function checkFootball(i: { goals: Record<Side, number>; events: Array<{ type: string; team: Side | null }>; lineupsA: number; lineupsB: number }): string[] {
  const out: string[] = [];
  for (const side of ["a", "b"] as const) {
    // A goal counts for the team that benefits: own goals are recorded against the scorer's team.
    const count = i.events.filter((e) => (e.type === "goal" || e.type === "penalty_goal") && e.team === side).length + i.events.filter((e) => e.type === "own_goal" && e.team !== null && e.team !== side).length;
    if (i.events.length > 0 && count !== i.goals[side]) out.push(`Team ${side.toUpperCase()}: ${count} goals in events, but the score is ${i.goals[side]}.`);
  }
  if (i.lineupsA === 0 || i.lineupsB === 0) out.push("Add lineups for both teams so appearances and clean sheets are counted.");
  return out;
}
