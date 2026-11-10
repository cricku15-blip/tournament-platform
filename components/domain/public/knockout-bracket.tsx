import Link from "next/link";
import { TeamLogo } from "@/components/ui/team-logo";
import { scoreText, type FixtureMatch } from "./fixture-ticket";
import type { TeamMap } from "./team-map";

type BracketMatch = FixtureMatch & { next_match_id: string | null; stage: string };

/** Groups matches into columns by distance from the final (following next_match_id). */
export function bracketColumns<T extends { id: string; next_match_id: string | null }>(matches: T[]): T[][] {
  const byId = new Map(matches.map((m) => [m.id, m]));
  const depth = (m: T, seen = new Set<string>()): number => {
    if (!m.next_match_id || seen.has(m.id)) return 0;
    const next = byId.get(m.next_match_id);
    if (!next) return 0;
    seen.add(m.id);
    return 1 + depth(next, seen);
  };
  const maxDepth = matches.reduce((n, m) => Math.max(n, depth(m)), 0);
  const cols: T[][] = Array.from({ length: maxDepth + 1 }, () => []);
  for (const m of matches) cols[maxDepth - depth(m)].push(m);
  return cols.filter((c) => c.length > 0);
}

const roundName = (fromEnd: number) => (fromEnd === 0 ? "Final" : fromEnd === 1 ? "Semi-finals" : fromEnd === 2 ? "Quarter-finals" : `Round of ${2 ** (fromEnd + 1)}`);

export function KnockoutBracket({
  matches,
  teams,
  sport,
  matchHref,
}: {
  matches: BracketMatch[];
  teams: TeamMap;
  sport: string;
  matchHref: (id: string) => string;
}) {
  const cols = bracketColumns(matches);
  return (
    <div className="-mx-4 overflow-x-auto px-4 pb-2" style={{ scrollSnapType: "x mandatory" }} role="region" aria-label="Knockout bracket" tabIndex={0}>
      <div className="flex min-w-max gap-6">
        {cols.map((col, ci) => (
          <section key={ci} className="flex w-64 shrink-0 flex-col justify-around gap-4" style={{ scrollSnapAlign: "start" }}>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted">{roundName(cols.length - 1 - ci)}</h3>
            {col.map((m) => {
              const rows = [
                { id: m.team_a_id, label: m.label_a, score: m.score_a },
                { id: m.team_b_id, label: m.label_b, score: m.score_b },
              ];
              return (
                <Link key={m.id} href={matchHref(m.id)} className="block rounded-card border border-line bg-card p-3 hover:border-primary/50 focus-visible:outline-2 focus-visible:outline-primary">
                  {rows.map((r, i) => {
                    const t = r.id ? teams[r.id] : null;
                    const won = !!m.winner_team_id && m.winner_team_id === r.id;
                    return (
                      <div key={i} className="flex min-h-9 items-center gap-2">
                        <TeamLogo src={t?.logo_url} name={t?.name ?? r.label ?? "TBD"} size="sm" />
                        <span className={won ? "flex-1 truncate font-bold" : "flex-1 truncate"}>{t?.name ?? r.label ?? "TBD"}</span>
                        <span className="font-display font-bold tabular-nums">{m.result_published_at ? (scoreText(r.score, sport) ?? "") : ""}</span>
                      </div>
                    );
                  })}
                </Link>
              );
            })}
          </section>
        ))}
      </div>
    </div>
  );
}
