import { TeamLogo } from "@/components/ui/team-logo";
import { Badge } from "@/components/ui/badge";
import { scoreText } from "./fixture-ticket";
import type { TeamLite } from "./team-map";

export function ScoreboardHeader({
  a,
  b,
  labelA,
  labelB,
  scoreA,
  scoreB,
  sport,
  status,
  resultText,
  showScore,
}: {
  a?: TeamLite | null;
  b?: TeamLite | null;
  labelA?: string | null;
  labelB?: string | null;
  scoreA: unknown;
  scoreB: unknown;
  sport: string;
  status: string;
  resultText?: string | null;
  showScore: boolean;
}) {
  const team = (t: TeamLite | null | undefined, label?: string | null, score?: unknown) => (
    <div className="flex flex-1 flex-col items-center gap-2 text-center">
      <TeamLogo src={t?.logo_url} name={t?.name ?? label ?? "TBD"} size="lg" />
      <p className="font-display text-xl font-bold text-ink sm:text-2xl">{t?.name ?? label ?? "To be decided"}</p>
      {showScore && <p className="font-display text-4xl font-bold tabular-nums text-ink sm:text-5xl">{scoreText(score, sport) ?? "–"}</p>}
    </div>
  );
  return (
    <section className="rounded-card border border-line bg-card p-6" aria-label="Scoreboard">
      <div className="mb-4 flex justify-center">
        <Badge variant={status === "live" ? "live" : status === "completed" || status === "walkover" ? "completed" : "neutral"} pulsing={status === "live"}>
          {status === "live" ? "Live" : status === "completed" ? "Full time" : status === "walkover" ? "Walkover" : "Upcoming"}
        </Badge>
      </div>
      <div className="flex items-start gap-4">
        {team(a, labelA, scoreA)}
        <span className="pt-8 font-display text-lg text-muted">vs</span>
        {team(b, labelB, scoreB)}
      </div>
      {resultText && <p className="mt-5 text-center text-sm font-semibold text-ink">{resultText}</p>}
    </section>
  );
}
