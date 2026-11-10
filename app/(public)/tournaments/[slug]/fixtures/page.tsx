import type { Metadata } from "next";
import Link from "next/link";
import { EmptyState } from "@/components/ui/empty-state";
import { FixtureTicket } from "@/components/domain/public/fixture-ticket";
import { teamMapFrom } from "@/components/domain/public/team-map";
import { formatDate } from "@/lib/format";
import { loadTournament } from "@/lib/public/page-helpers";
import { getTournamentMatches, getTournamentTeams } from "@/lib/public/queries";

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<{ team?: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const t = await loadTournament((await params).slug, "/fixtures");
  return { title: `Fixtures | ${t.name}`, description: `Match schedule and results for ${t.name}.`, alternates: { canonical: `/tournaments/${t.slug}/fixtures` } };
}

export default async function FixturesPage({ params, searchParams }: Props) {
  const t = await loadTournament((await params).slug, "/fixtures");
  const { team } = await searchParams;
  const [matches, teams] = await Promise.all([getTournamentMatches(t.id), getTournamentTeams(t.id)]);
  const map = teamMapFrom(teams);
  const teamId = teams.find((x) => x.slug === team)?.id;
  const list = (teamId ? matches.filter((m) => m.team_a_id === teamId || m.team_b_id === teamId) : matches).slice();
  list.sort((a, b) => Number(b.status === "live") - Number(a.status === "live"));

  const groups = new Map<string, typeof list>();
  for (const m of list) {
    const key = m.status === "live" ? "Live now" : m.scheduled_at ? formatDate(m.scheduled_at) : "Date to be announced";
    groups.set(key, [...(groups.get(key) ?? []), m]);
  }

  return (
    <div className="flex flex-col gap-6">
      <nav aria-label="Filter by team" className="flex flex-wrap gap-2">
        <Link href={`/tournaments/${t.slug}/fixtures`} className={`rounded-badge border px-3 py-1.5 text-sm font-semibold ${!teamId ? "border-primary bg-primary/10 text-primary" : "border-line text-muted"}`}>
          All teams
        </Link>
        {teams.map((x) => (
          <Link key={x.id} href={`/tournaments/${t.slug}/fixtures?team=${x.slug}`} className={`rounded-badge border px-3 py-1.5 text-sm font-semibold ${x.id === teamId ? "border-primary bg-primary/10 text-primary" : "border-line text-muted"}`}>
            {x.name}
          </Link>
        ))}
      </nav>
      {list.length === 0 ? (
        <EmptyState title="Fixtures not published yet" description="The organizer will publish the match schedule soon." />
      ) : (
        [...groups.entries()].map(([label, ms]) => (
          <section key={label} aria-label={label}>
            <h2 className="mb-3 font-display text-xl font-bold">{label}</h2>
            <ul className="grid gap-3 md:grid-cols-2">
              {ms.map((m) => (
                <li key={m.id}>
                  <FixtureTicket m={m} teams={map} sport={t.sport_slug} href={`/tournaments/${t.slug}/matches/${m.id}`} />
                </li>
              ))}
            </ul>
          </section>
        ))
      )}
    </div>
  );
}
