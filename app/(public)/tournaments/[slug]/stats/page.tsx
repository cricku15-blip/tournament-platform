import type { Metadata } from "next";
import { EmptyState } from "@/components/ui/empty-state";
import { LeaderboardCard } from "@/components/domain/public/leaderboard-card";
import { loadTournament } from "@/lib/public/page-helpers";
import { getTournamentLeaderboards } from "@/lib/public/queries";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const t = await loadTournament((await params).slug, "/stats");
  return { title: `Stats | ${t.name}`, description: `Top performers in ${t.name}.`, alternates: { canonical: `/tournaments/${t.slug}/stats` } };
}

export default async function StatsPage({ params }: Props) {
  const t = await loadTournament((await params).slug, "/stats");
  const boards = await getTournamentLeaderboards(t.id, t.sport_slug);
  if (boards.every((b) => b.rows.length === 0)) return <EmptyState title="No stats yet" description="Leaderboards fill in as match stats are published." />;
  return (
    <div className="grid gap-5 md:grid-cols-2">
      {boards.map((b) => (
        <LeaderboardCard key={b.key} title={b.title} rows={b.rows} />
      ))}
    </div>
  );
}
