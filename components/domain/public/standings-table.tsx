import Link from "next/link";
import { TeamLogo } from "@/components/ui/team-logo";
import { cn } from "@/lib/utils";
import type { TeamMap } from "./team-map";

export interface StandingRow {
  team_id: string | null;
  played: number | null;
  won: number | null;
  lost: number | null;
  tied: number | null;
  drawn: number | null;
  no_result: number | null;
  points: number | null;
  nrr: number | null;
  gf: number | null;
  ga: number | null;
  gd: number | null;
  position: number | null;
}

export function StandingsTable({
  rows,
  teams,
  sport,
  qualifying = 0,
  teamHref,
}: {
  rows: StandingRow[];
  teams: TeamMap;
  sport: string;
  qualifying?: number;
  teamHref: (slug: string) => string;
}) {
  const cricket = sport !== "football";
  const cols = cricket
    ? [["P", "played"], ["W", "won"], ["L", "lost"], ["T", "tied"], ["NR", "no_result"], ["Pts", "points"], ["NRR", "nrr"]]
    : [["P", "played"], ["W", "won"], ["D", "drawn"], ["L", "lost"], ["GF", "gf"], ["GA", "ga"], ["GD", "gd"], ["Pts", "points"]];
  const fmt = (key: string, v: number | null) => {
    if (v === null || v === undefined) return "–";
    if (key === "nrr") return (v > 0 ? "+" : "") + Number(v).toFixed(3);
    if (key === "gd") return v > 0 ? `+${v}` : String(v);
    return String(v);
  };
  return (
    <div>
      {/* Desktop table */}
      <div className="hidden overflow-x-auto rounded-card border border-line bg-card md:block">
        <table className="w-full text-sm">
          <caption className="sr-only">Standings</caption>
          <thead className="bg-surface text-left text-xs uppercase tracking-wide text-muted">
            <tr>
              <th scope="col" className="w-10 px-3 py-3">#</th>
              <th scope="col" className="px-3 py-3">Team</th>
              {cols.map(([h]) => (
                <th key={h} scope="col" className="px-3 py-3 text-right">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map((r, i) => {
              const t = r.team_id ? teams[r.team_id] : null;
              const pos = r.position ?? i + 1;
              return (
                <tr key={r.team_id ?? i} className={cn(pos <= qualifying && "bg-primary/10")}>
                  <td className="px-3 py-3 font-display font-bold">{pos}</td>
                  <td className="px-3 py-3">
                    <Link href={t?.slug ? teamHref(t.slug) : "#"} className="flex min-h-11 items-center gap-2 font-semibold hover:text-primary">
                      <TeamLogo src={t?.logo_url} name={t?.name ?? "Team"} size="sm" /> {t?.name ?? "Team"}
                    </Link>
                  </td>
                  {cols.map(([h, k]) => (
                    <td key={h} className={cn("px-3 py-3 text-right tabular-nums", h === "Pts" && "font-bold")}>
                      {fmt(k, (r as unknown as Record<string, number | null>)[k])}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {/* Mobile cards */}
      <ul className="flex flex-col gap-3 md:hidden">
        {rows.map((r, i) => {
          const t = r.team_id ? teams[r.team_id] : null;
          const pos = r.position ?? i + 1;
          return (
            <li key={r.team_id ?? i} className={cn("rounded-card border border-line bg-card p-4", pos <= qualifying && "border-primary/50 bg-primary/10")}>
              <div className="flex items-center gap-3">
                <span className="font-display text-xl font-bold">{pos}</span>
                <TeamLogo src={t?.logo_url} name={t?.name ?? "Team"} size="sm" />
                <span className="flex-1 truncate font-semibold">{t?.name ?? "Team"}</span>
                <span className="font-display text-xl font-bold">{r.points ?? 0} pts</span>
              </div>
              <dl className="mt-3 grid grid-cols-4 gap-2 text-center text-xs text-muted">
                {cols.filter(([h]) => h !== "Pts").map(([h, k]) => (
                  <div key={h}>
                    <dt>{h}</dt>
                    <dd className="font-semibold text-ink tabular-nums">{fmt(k, (r as unknown as Record<string, number | null>)[k])}</dd>
                  </div>
                ))}
              </dl>
            </li>
          );
        })}
      </ul>
      {qualifying > 0 && (
        <p className="mt-3 flex items-center gap-2 text-xs text-muted">
          <span className="h-3 w-3 rounded-sm bg-primary/30" aria-hidden /> Qualifies for playoffs
        </p>
      )}
    </div>
  );
}
