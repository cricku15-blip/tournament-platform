import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { TeamLogo } from "@/components/ui/team-logo";
import { formatDateTime } from "@/lib/format";
import { oversFromBalls } from "@/lib/public/labels";
import type { TeamMap } from "./team-map";

export interface FixtureMatch {
  id: string;
  team_a_id: string | null;
  team_b_id: string | null;
  label_a: string | null;
  label_b: string | null;
  scheduled_at: string | null;
  venue: string | null;
  status: string;
  result_text: string | null;
  result_published_at: string | null;
  score_a: unknown;
  score_b: unknown;
  stage?: string;
  round_no?: number | null;
  winner_team_id?: string | null;
}

type Score = { runs?: number; wickets?: number; balls?: number; goals?: number };

export function scoreText(score: unknown, sport: string): string | null {
  const s = (score ?? {}) as Score;
  if (sport === "football") return s.goals !== undefined ? String(s.goals) : null;
  if (s.runs === undefined) return null;
  const wk = s.wickets !== undefined ? `/${s.wickets}` : "";
  const ov = s.balls !== undefined ? ` (${oversFromBalls(s.balls)})` : "";
  return `${s.runs}${wk}${ov}`;
}

const STATUS: Record<string, { label: string; variant: "neutral" | "live" | "completed" | "cancelled" }> = {
  scheduled: { label: "Scheduled", variant: "neutral" },
  live: { label: "Live", variant: "live" },
  completed: { label: "Completed", variant: "completed" },
  walkover: { label: "Walkover", variant: "completed" },
  postponed: { label: "Postponed", variant: "neutral" },
  cancelled: { label: "Cancelled", variant: "cancelled" },
};

export function FixtureTicket({
  m,
  teams,
  sport,
  href,
}: {
  m: FixtureMatch;
  teams: TeamMap;
  sport: string;
  href: string;
}) {
  const a = m.team_a_id ? teams[m.team_a_id] : null;
  const b = m.team_b_id ? teams[m.team_b_id] : null;
  const st = STATUS[m.status] ?? STATUS.scheduled;
  const showScore = m.result_published_at !== null || m.status === "live";
  const side = (team: typeof a, label: string | null, score: unknown, won: boolean) => (
    <div className="flex min-w-0 flex-1 items-center gap-3">
      <TeamLogo src={team?.logo_url} name={team?.name ?? label ?? "TBD"} size="sm" />
      <div className="min-w-0">
        <p className={won ? "truncate font-bold text-ink" : "truncate font-semibold text-ink"}>{team?.name ?? label ?? "To be decided"}</p>
        {showScore && <p className="font-display text-lg font-bold text-ink">{scoreText(score, sport) ?? "–"}</p>}
      </div>
    </div>
  );
  return (
    <Link
      href={href}
      className="block rounded-card border border-line bg-card p-4 transition-colors hover:border-primary/50 focus-visible:outline-2 focus-visible:outline-primary"
      style={{ borderStyle: "solid", maskImage: "radial-gradient(circle 8px at 0 50%, transparent 98%, #000) , radial-gradient(circle 8px at 100% 50%, transparent 98%, #000)", maskComposite: "intersect" }}
    >
      <div className="mb-3 flex items-center justify-between gap-2 text-xs text-muted">
        <span>{m.scheduled_at ? formatDateTime(m.scheduled_at) : "Date to be announced"}</span>
        <Badge variant={st.variant} pulsing={m.status === "live"}>
          {st.label}
        </Badge>
      </div>
      <div className="flex items-center gap-3">
        {side(a, m.label_a, m.score_a, m.winner_team_id === m.team_a_id && !!m.winner_team_id)}
        <span className="text-xs font-semibold text-muted">vs</span>
        {side(b, m.label_b, m.score_b, m.winner_team_id === m.team_b_id && !!m.winner_team_id)}
      </div>
      {(m.result_text || m.venue) && (
        <p className="mt-3 text-xs text-muted">{m.result_text ?? m.venue}</p>
      )}
    </Link>
  );
}
