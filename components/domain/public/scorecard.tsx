import Link from "next/link";
import { oversFromBalls } from "@/lib/public/labels";

type Row = Record<string, unknown>;
type Names = Record<string, { full_name?: string | null; username?: string | null }>;

function PlayerName({ id, names }: { id: unknown; names: Names }) {
  const p = typeof id === "string" ? names[id] : undefined;
  if (!p) return <span className="text-muted">–</span>;
  return p.username ? (
    <Link href={`/players/${p.username}`} className="hover:text-primary">
      {p.full_name ?? p.username}
    </Link>
  ) : (
    <span>{p.full_name ?? "Player"}</span>
  );
}

const n = (v: unknown) => (typeof v === "number" ? v : 0);

export function CricketScorecard({ batting, bowling, names, teamNames }: { batting: Row[]; bowling: Row[]; names: Names; teamNames: Record<string, string> }) {
  const innings = [...new Set([...batting, ...bowling].map((r) => n(r.innings)))].sort();
  if (innings.length === 0) return <p className="text-sm text-muted">The scorecard will appear once the result is published.</p>;
  return (
    <div className="flex flex-col gap-8">
      {innings.map((inn) => {
        const bat = batting.filter((r) => n(r.innings) === inn);
        const bowl = bowling.filter((r) => n(r.innings) === inn);
        const teamId = bat[0]?.team_id;
        return (
          <section key={inn} aria-label={`Innings ${inn}`}>
            <h3 className="mb-3 font-display text-xl font-bold">
              Innings {inn}
              {typeof teamId === "string" && teamNames[teamId] ? ` · ${teamNames[teamId]}` : ""}
            </h3>
            <div className="overflow-x-auto rounded-card border border-line bg-card">
              <table className="w-full text-sm">
                <caption className="sr-only">Batting</caption>
                <thead className="bg-surface text-left text-xs uppercase text-muted">
                  <tr>
                    <th scope="col" className="px-3 py-2">Batter</th>
                    <th scope="col" className="px-3 py-2">Dismissal</th>
                    {["R", "B", "4s", "6s", "SR"].map((h) => (
                      <th key={h} scope="col" className="px-3 py-2 text-right">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {bat.map((r, i) => (
                    <tr key={i}>
                      <td className="px-3 py-2 font-semibold"><PlayerName id={r.player_id} names={names} /></td>
                      <td className="px-3 py-2 text-muted">{String(r.dismissal ?? "Not out")}</td>
                      <td className="px-3 py-2 text-right font-bold tabular-nums">{n(r.runs)}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{n(r.balls)}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{n(r.fours)}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{n(r.sixes)}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{n(r.balls) > 0 ? ((n(r.runs) * 100) / n(r.balls)).toFixed(1) : "–"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {bowl.length > 0 && (
              <div className="mt-4 overflow-x-auto rounded-card border border-line bg-card">
                <table className="w-full text-sm">
                  <caption className="sr-only">Bowling</caption>
                  <thead className="bg-surface text-left text-xs uppercase text-muted">
                    <tr>
                      <th scope="col" className="px-3 py-2">Bowler</th>
                      {["O", "M", "R", "W", "Econ"].map((h) => (
                        <th key={h} scope="col" className="px-3 py-2 text-right">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {bowl.map((r, i) => (
                      <tr key={i}>
                        <td className="px-3 py-2 font-semibold"><PlayerName id={r.player_id} names={names} /></td>
                        <td className="px-3 py-2 text-right tabular-nums">{oversFromBalls(n(r.balls_bowled))}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{n(r.maidens)}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{n(r.runs)}</td>
                        <td className="px-3 py-2 text-right font-bold tabular-nums">{n(r.wickets)}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{n(r.balls_bowled) > 0 ? ((n(r.runs) * 6) / n(r.balls_bowled)).toFixed(2) : "–"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}

const EVENT_LABEL: Record<string, string> = {
  goal: "Goal",
  own_goal: "Own goal",
  penalty_goal: "Penalty",
  yellow: "Yellow card",
  red: "Red card",
  substitution: "Substitution",
};

export function FootballScorecard({ lineups, events, names, teamNames }: { lineups: Row[]; events: Row[]; names: Names; teamNames: Record<string, string> }) {
  if (lineups.length === 0 && events.length === 0) return <p className="text-sm text-muted">The match report will appear once the result is published.</p>;
  const teamIds = [...new Set(lineups.map((l) => l.team_id).filter((x): x is string => typeof x === "string"))];
  return (
    <div className="flex flex-col gap-8">
      {events.length > 0 && (
        <section aria-label="Match events">
          <h3 className="mb-3 font-display text-xl font-bold">Events</h3>
          <ol className="divide-y divide-line rounded-card border border-line bg-card">
            {events.map((e, i) => (
              <li key={i} className="flex min-h-11 items-center gap-3 px-4 py-2 text-sm">
                <span className="w-10 font-display font-bold tabular-nums">{n(e.minute)}&apos;</span>
                <span className="font-semibold">{EVENT_LABEL[String(e.type)] ?? String(e.type)}</span>
                <PlayerName id={e.player_id} names={names} />
                {typeof e.team_id === "string" && teamNames[e.team_id] && <span className="ml-auto text-xs text-muted">{teamNames[e.team_id]}</span>}
              </li>
            ))}
          </ol>
        </section>
      )}
      {teamIds.map((tid) => (
        <section key={tid} aria-label={`${teamNames[tid] ?? "Team"} lineup`}>
          <h3 className="mb-3 font-display text-xl font-bold">{teamNames[tid] ?? "Team"} lineup</h3>
          <ul className="grid gap-2 sm:grid-cols-2">
            {lineups
              .filter((l) => l.team_id === tid)
              .map((l, i) => (
                <li key={i} className="flex items-center justify-between rounded-input border border-line bg-card px-3 py-2 text-sm">
                  <PlayerName id={l.player_id} names={names} />
                  <span className="text-xs text-muted">{String(l.position ?? "")}{l.is_starter === false ? " · sub" : ""}</span>
                </li>
              ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
