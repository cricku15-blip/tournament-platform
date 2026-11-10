import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { TeamLogo } from "@/components/ui/team-logo";
import { EmptyState } from "@/components/ui/empty-state";
import { FixtureTicket } from "@/components/domain/public/fixture-ticket";
import { PlayerCard } from "@/components/domain/public/player-card";
import { StandingsTable } from "@/components/domain/public/standings-table";
import { teamMapFrom } from "@/components/domain/public/team-map";
import { loadTournament } from "@/lib/public/page-helpers";
import { getTeam, getTournamentMatches, getTournamentStandings, getTournamentTeams } from "@/lib/public/queries";

type Props = { params: Promise<{ slug: string; team: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, team } = await params;
  const t = await loadTournament(slug);
  const data = await getTeam(t.id, team);
  if (!data) return { title: "Team not found" };
  return {
    title: `${data.team.name} | ${t.name}`,
    description: data.team.description ?? `${data.team.name} squad, fixtures and results in ${t.name}.`,
    alternates: { canonical: `/tournaments/${t.slug}/teams/${data.team.slug}` },
  };
}

export default async function TeamPage({ params }: Props) {
  const { slug, team: teamSlug } = await params;
  const t = await loadTournament(slug);
  const data = await getTeam(t.id, teamSlug);
  if (!data) notFound();
  const { team, squad } = data;
  const [matches, standings, teams] = await Promise.all([getTournamentMatches(t.id), getTournamentStandings(t.id), getTournamentTeams(t.id)]);
  const map = teamMapFrom(teams);
  const mine = matches.filter((m) => m.team_a_id === team.id || m.team_b_id === team.id);
  const myRow = standings.filter((r) => r.team_id === team.id);

  return (
    <div className="flex flex-col gap-10">
      <header className="flex items-center gap-4">
        <TeamLogo src={team.logo_url} name={team.name ?? "Team"} size="xl" />
        <div>
          <h2 className="font-display text-3xl font-bold">{team.name}</h2>
          {team.home_ground && <p className="text-sm text-muted">Home ground: {team.home_ground}</p>}
          {team.description && <p className="mt-1 max-w-2xl text-sm text-ink/90">{team.description}</p>}
        </div>
      </header>

      <section aria-label="Squad">
        <h3 className="mb-3 font-display text-2xl font-bold">Squad</h3>
        {!team.squad_locked && <p className="mb-3 text-sm text-muted">Squad not finalised. Players may still change.</p>}
        {squad.length === 0 ? (
          <EmptyState description="No players have been added yet." />
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {squad.map((p) => (
              <li key={p.user_id}>
                <PlayerCard
                  name={p.full_name}
                  username={p.username}
                  avatarUrl={p.avatar_url}
                  meta={[p.jersey_no !== null ? `#${p.jersey_no}` : null, t.squad_mode === "auction" && p.price !== null ? `${p.price} pts` : null].filter(Boolean).join(" · ")}
                />
              </li>
            ))}
          </ul>
        )}
      </section>

      {myRow.length > 0 && myRow[0].played ? (
        <section aria-label="Team stats">
          <h3 className="mb-3 font-display text-2xl font-bold">Team record</h3>
          <StandingsTable rows={myRow} teams={map} sport={t.sport_slug} teamHref={(s) => `/tournaments/${t.slug}/teams/${s}`} />
        </section>
      ) : null}

      <section aria-label="Fixtures and results">
        <h3 className="mb-3 font-display text-2xl font-bold">Fixtures and results</h3>
        {mine.length === 0 ? (
          <EmptyState description="No fixtures published for this team yet." />
        ) : (
          <ul className="grid gap-3 md:grid-cols-2">
            {mine.map((m) => (
              <li key={m.id}>
                <FixtureTicket m={m} teams={map} sport={t.sport_slug} href={`/tournaments/${t.slug}/matches/${m.id}`} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
