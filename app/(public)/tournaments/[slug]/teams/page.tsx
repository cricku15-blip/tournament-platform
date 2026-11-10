import type { Metadata } from "next";
import Link from "next/link";
import { EmptyState } from "@/components/ui/empty-state";
import { TeamCard } from "@/components/domain/public/team-card";
import { loadTournament } from "@/lib/public/page-helpers";
import { getTournamentTeams } from "@/lib/public/queries";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const t = await loadTournament((await params).slug, "/teams");
  return { title: `Teams | ${t.name}`, description: `Teams playing in ${t.name}.`, alternates: { canonical: `/tournaments/${t.slug}/teams` } };
}

export default async function TeamsPage({ params }: Props) {
  const t = await loadTournament((await params).slug, "/teams");
  const teams = await getTournamentTeams(t.id);
  return (
    <div className="flex flex-col gap-6">
      {t.status === "registration_open" && t.team_entry === "open" && (
        <section className="rounded-card border border-primary/30 bg-primary/10 p-4">
          <h2 className="font-display text-lg font-bold">Have a team?</h2>
          <p className="text-sm text-muted">Applications are open. Apply with your team and the organizer will review it.</p>
          <Link href={`/tournaments/${t.slug}/apply-team`} className="mt-2 inline-block text-sm font-semibold text-primary hover:underline">
            Join with your team
          </Link>
        </section>
      )}
      {teams.length === 0 ? (
        <EmptyState title="No teams yet" description="Teams will appear here once the organizer approves them." />
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {teams.map((tm) => (
            <li key={tm.id}>
              <TeamCard href={`/tournaments/${t.slug}/teams/${tm.slug}`} name={tm.name} logoUrl={tm.logo_url} squadSize={tm.squad_size} homeGround={tm.home_ground} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
