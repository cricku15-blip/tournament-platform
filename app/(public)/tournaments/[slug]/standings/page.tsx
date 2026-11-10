import type { Metadata } from "next";
import { EmptyState } from "@/components/ui/empty-state";
import { KnockoutBracket } from "@/components/domain/public/knockout-bracket";
import { StandingsTable } from "@/components/domain/public/standings-table";
import { teamMapFrom } from "@/components/domain/public/team-map";
import { loadTournament } from "@/lib/public/page-helpers";
import { getTournamentMatches, getTournamentStandings, getTournamentTeams } from "@/lib/public/queries";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const t = await loadTournament((await params).slug, "/standings");
  return { title: `Standings | ${t.name}`, description: `Points table and bracket for ${t.name}.`, alternates: { canonical: `/tournaments/${t.slug}/standings` } };
}

export default async function StandingsPage({ params }: Props) {
  const t = await loadTournament((await params).slug, "/standings");
  const [rows, matches, teams] = await Promise.all([getTournamentStandings(t.id), getTournamentMatches(t.id), getTournamentTeams(t.id)]);
  const map = teamMapFrom(teams);
  const knockout = matches.filter((m) => m.stage !== "league");
  const showTable = t.format !== "knockout";
  const qualifying = t.format === "league_playoffs" ? (t.playoff_style === "top2_final" ? 2 : 4) : 0;
  const nothingYet = (!showTable || rows.every((r) => !r.played)) && knockout.length === 0;

  if (nothingYet) return <EmptyState title="No standings yet" description="Standings update automatically as results are published." />;
  return (
    <div className="flex flex-col gap-10">
      {showTable && rows.length > 0 && (
        <section aria-label="League table">
          <h2 className="mb-3 font-display text-2xl font-bold">{t.format === "league_playoffs" ? "League table" : "Points table"}</h2>
          <StandingsTable rows={rows} teams={map} sport={t.sport_slug} qualifying={qualifying} teamHref={(s) => `/tournaments/${t.slug}/teams/${s}`} />
        </section>
      )}
      {knockout.length > 0 && (
        <section aria-label="Bracket">
          <h2 className="mb-3 font-display text-2xl font-bold">{t.format === "league_playoffs" ? "Playoffs" : "Bracket"}</h2>
          <KnockoutBracket matches={knockout as never} teams={map} sport={t.sport_slug} matchHref={(id) => `/tournaments/${t.slug}/matches/${id}`} />
        </section>
      )}
    </div>
  );
}
