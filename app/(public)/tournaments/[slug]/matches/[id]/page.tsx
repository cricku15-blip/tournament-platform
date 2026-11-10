import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ScoreboardHeader } from "@/components/domain/public/scoreboard-header";
import { CricketScorecard, FootballScorecard } from "@/components/domain/public/scorecard";
import { teamMapFrom } from "@/components/domain/public/team-map";
import { formatDateTime } from "@/lib/format";
import { loadTournament } from "@/lib/public/page-helpers";
import { getMatch, getTournamentTeams } from "@/lib/public/queries";

type Props = { params: Promise<{ slug: string; id: string }> };
const UUID = /^[0-9a-f-]{36}$/i;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, id } = await params;
  if (!UUID.test(id)) return { title: "Match not found" };
  const t = await loadTournament(slug);
  const [data, teams] = await Promise.all([getMatch(t.id, id), getTournamentTeams(t.id)]);
  if (!data) return { title: "Match not found" };
  const map = teamMapFrom(teams);
  const a = data.match.team_a_id ? map[data.match.team_a_id]?.name : data.match.label_a;
  const b = data.match.team_b_id ? map[data.match.team_b_id]?.name : data.match.label_b;
  return {
    title: `${a ?? "TBD"} vs ${b ?? "TBD"} | ${t.name}`,
    description: data.match.result_text ?? `${a ?? "TBD"} vs ${b ?? "TBD"} in ${t.name}.`,
    alternates: { canonical: `/tournaments/${t.slug}/matches/${id}` },
  };
}

export default async function MatchPage({ params }: Props) {
  const { slug, id } = await params;
  if (!UUID.test(id)) notFound();
  const t = await loadTournament(slug);
  const [data, teams] = await Promise.all([getMatch(t.id, id), getTournamentTeams(t.id)]);
  if (!data) notFound();
  const { match } = data;
  const map = teamMapFrom(teams);
  const teamNames = Object.fromEntries(teams.filter((x) => x.id).map((x) => [x.id as string, x.name ?? ""]));
  const published = match.result_published_at !== null;
  const a = match.team_a_id ? map[match.team_a_id] : null;
  const b = match.team_b_id ? map[match.team_b_id] : null;

  return (
    <div className="flex flex-col gap-8">
      <Link href={`/tournaments/${t.slug}/fixtures`} className="text-sm font-semibold text-primary hover:underline">
        ← All fixtures
      </Link>
      <ScoreboardHeader
        a={a}
        b={b}
        labelA={match.label_a}
        labelB={match.label_b}
        scoreA={match.score_a}
        scoreB={match.score_b}
        sport={t.sport_slug}
        status={match.status}
        resultText={match.result_text}
        showScore={published || match.status === "live"}
      />
      <dl className="grid gap-3 text-sm sm:grid-cols-3">
        <div className="rounded-card border border-line bg-card p-4">
          <dt className="text-xs text-muted">When</dt>
          <dd className="font-semibold">{match.scheduled_at ? formatDateTime(match.scheduled_at) : "To be announced"}</dd>
        </div>
        <div className="rounded-card border border-line bg-card p-4">
          <dt className="text-xs text-muted">Venue</dt>
          <dd className="font-semibold">{match.venue ?? t.venue_name ?? "To be announced"}</dd>
        </div>
        {published && data.playerOfMatch ? (
          <div className="rounded-card border border-line bg-card p-4">
            <dt className="text-xs text-muted">Player of the match</dt>
            <dd className="font-semibold">
              {data.playerOfMatch.username ? <Link href={`/players/${data.playerOfMatch.username}`} className="hover:text-primary">{data.playerOfMatch.full_name}</Link> : data.playerOfMatch.full_name}
            </dd>
          </div>
        ) : (
          <div className="rounded-card border border-line bg-card p-4">
            <dt className="text-xs text-muted">Head to head</dt>
            <dd className="font-semibold">{data.headToHead} {data.headToHead === 1 ? "match" : "matches"} played</dd>
          </div>
        )}
      </dl>
      {published &&
        (t.sport_slug === "football" ? (
          <FootballScorecard lineups={data.lineups} events={data.events} names={data.names} teamNames={teamNames} />
        ) : (
          <CricketScorecard batting={data.batting} bowling={data.bowling} names={data.names} teamNames={teamNames} />
        ))}
      {match.notes && (
        <section>
          <h2 className="mb-2 font-display text-xl font-bold">Notes</h2>
          <p className="whitespace-pre-line text-ink/90">{match.notes}</p>
        </section>
      )}
    </div>
  );
}
