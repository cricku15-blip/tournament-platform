import { ballsToOvers } from "@/lib/results/logic";

export type Side = "a" | "b";
export interface Player { id: string; name: string }
export interface TeamInfo { id: string; name: string; players: Player[] }

export interface BatRow { innings: 1 | 2; playerId: string; runs: number; balls: number; fours: number; sixes: number; dismissal: string; bowlerId: string; fielderId: string }
export interface BowlRow { innings: 1 | 2; playerId: string; overs: string; maidens: number; runs: number; wickets: number; wides: number; noBalls: number }
export interface FieldRow { playerId: string; catches: number; runOuts: number; stumpings: number }
export interface LineRow { side: Side; playerId: string; isStarter: boolean; position: string }
export interface EventRow { type: string; side: Side | ""; playerId: string; assistId: string; minute: string }

export interface TotalState { runs: number; wickets: number; overs: string; extras: number }
export interface FootballScoreState { goals: number; ht: string; et: string; pens: string }

export interface FormState {
  resultType: string;
  winnerTeamId: string;
  resultText: string;
  pomId: string;
  notes: string;
  battedFirst: Side;
  toss: { winner: "" | Side; decision: "" | "bat" | "bowl" };
  totals: Record<Side, TotalState>;
  batting: BatRow[];
  bowling: BowlRow[];
  fielding: FieldRow[];
  fb: Record<Side, FootballScoreState>;
  lineups: LineRow[];
  events: EventRow[];
}

export const DISMISSALS = ["Not out", "Bowled", "Caught", "LBW", "Run out", "Stumped", "Hit wicket", "Retired", "Absent"];
export const POSITIONS = ["Goalkeeper", "Defender", "Midfielder", "Forward"];
export const EVENT_TYPES: Array<[string, string]> = [["goal", "Goal"], ["own_goal", "Own goal"], ["penalty_goal", "Penalty goal"], ["yellow", "Yellow card"], ["red", "Red card"], ["sub", "Substitution"]];

export function emptyState(): FormState {
  const t = (): TotalState => ({ runs: 0, wickets: 0, overs: "0.0", extras: 0 });
  const f = (): FootballScoreState => ({ goals: 0, ht: "", et: "", pens: "" });
  return { resultType: "", winnerTeamId: "", resultText: "", pomId: "", notes: "", battedFirst: "a", toss: { winner: "", decision: "" }, totals: { a: t(), b: t() }, batting: [], bowling: [], fielding: [], fb: { a: f(), b: f() }, lineups: [], events: [] };
}

type Json = Record<string, unknown> | null | undefined;
const num = (v: unknown) => (typeof v === "number" ? v : 0);

/** Rebuilds the form from saved match, score and stat rows (also used when reopening a draft). */
export function stateFromSaved(o: {
  match: { result_type: string | null; winner_team_id: string | null; result_text: string | null; player_of_match_id: string | null; notes: string | null; score_a: Json; score_b: Json; toss: Json; team_a_id: string; team_b_id: string };
  batting: Array<Record<string, unknown>>;
  bowling: Array<Record<string, unknown>>;
  fielding: Array<Record<string, unknown>>;
  lineups: Array<Record<string, unknown>>;
  events: Array<Record<string, unknown>>;
}): FormState {
  const s = emptyState();
  const m = o.match;
  s.resultType = m.result_type ?? "";
  s.winnerTeamId = m.winner_team_id ?? "";
  s.resultText = m.result_text ?? "";
  s.pomId = m.player_of_match_id ?? "";
  s.notes = m.notes ?? "";
  const toss = (m.toss ?? {}) as { winner?: Side; decision?: "bat" | "bowl"; batted_first?: Side };
  s.toss = { winner: toss.winner ?? "", decision: toss.decision ?? "" };
  s.battedFirst = toss.batted_first ?? (toss.winner && toss.decision ? (toss.decision === "bat" ? toss.winner : toss.winner === "a" ? "b" : "a") : "a");
  for (const side of ["a", "b"] as const) {
    const sc = (side === "a" ? m.score_a : m.score_b) ?? {};
    s.totals[side] = { runs: num(sc.runs), wickets: num(sc.wickets), overs: ballsToOvers(num(sc.balls)), extras: num(sc.extras) };
    s.fb[side] = { goals: num(sc.goals), ht: sc.ht != null ? String(sc.ht) : "", et: sc.et != null ? String(sc.et) : "", pens: sc.pens != null ? String(sc.pens) : "" };
  }
  s.batting = o.batting.map((r) => ({ innings: (num(r.innings) === 2 ? 2 : 1) as 1 | 2, playerId: String(r.player_id), runs: num(r.runs), balls: num(r.balls), fours: num(r.fours), sixes: num(r.sixes), dismissal: String(r.dismissal ?? "Not out"), bowlerId: String(r.bowler_id ?? ""), fielderId: String(r.fielder_id ?? "") }));
  s.bowling = o.bowling.map((r) => ({ innings: (num(r.innings) === 2 ? 2 : 1) as 1 | 2, playerId: String(r.player_id), overs: ballsToOvers(num(r.balls_bowled)), maidens: num(r.maidens), runs: num(r.runs), wickets: num(r.wickets), wides: num(r.wides), noBalls: num(r.no_balls) }));
  s.fielding = o.fielding.map((r) => ({ playerId: String(r.player_id), catches: num(r.catches), runOuts: num(r.run_outs), stumpings: num(r.stumpings) }));
  s.lineups = o.lineups.map((r) => ({ side: r.team_id === m.team_a_id ? "a" : "b", playerId: String(r.player_id), isStarter: r.is_starter !== false, position: String(r.position ?? "") }));
  s.events = o.events.map((r) => ({ type: String(r.type), side: r.team_id === m.team_a_id ? "a" : r.team_id === m.team_b_id ? "b" : "", playerId: String(r.player_id ?? ""), assistId: String(r.assist_player_id ?? ""), minute: r.minute != null ? String(r.minute) : "" }));
  return s;
}
