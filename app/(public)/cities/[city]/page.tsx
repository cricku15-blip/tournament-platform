import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { StatTile } from "@/components/ui/stat-tile";
import { EmptyState } from "@/components/ui/empty-state";
import { FilterBar } from "@/components/domain/public/filter-bar";
import { TournamentCard } from "@/components/domain/public/tournament-card";
import { parseFilters } from "@/lib/public/filters";
import { getCityBySlug, getSports, listTournaments } from "@/lib/public/queries";

type Props = { params: Promise<{ city: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const city = await getCityBySlug((await params).city);
  if (!city) return { title: "City not found" };
  return {
    title: `Sports tournaments in ${city.name}`,
    description: `Cricket and football tournaments, teams and players in ${city.name}.`,
    alternates: { canonical: `/cities/${city.slug}` },
  };
}

export default async function CityPage({ params, searchParams }: Props) {
  const slug = (await params).city;
  if (!/^[a-z0-9-]{1,40}$/.test(slug)) notFound();
  const city = await getCityBySlug(slug);
  if (!city) notFound();
  const filters = { ...parseFilters(await searchParams), city: city.slug };
  const [sports, result] = await Promise.all([getSports(), listTournaments(filters)]);
  const upcomingAuctions = result.items.filter((t) => t.squad_mode === "auction" && ["registration_open", "registration_closed", "auction"].includes(t.status));

  return (
    <>
      <FilterBar filters={filters} sports={sports} cities={[]} action={`/cities/${city.slug}`} hideCity />
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <h1 className="font-display text-4xl font-bold text-ink">Tournaments in {city.name}</h1>
        <div className="mt-5 grid grid-cols-3 gap-3">
          <StatTile label="Tournaments" value={city.stats.tournaments} />
          <StatTile label="Teams" value={city.stats.teams} />
          <StatTile label="Players" value={city.stats.players} />
        </div>
        {upcomingAuctions.length > 0 && (
          <section className="mt-8" aria-label="Upcoming auctions">
            <h2 className="mb-3 font-display text-2xl font-bold">Upcoming auctions</h2>
            <ul className="divide-y divide-line rounded-card border border-line bg-card">
              {upcomingAuctions.map((t) => (
                <li key={t.id} className="px-4 py-3">
                  <a href={`/tournaments/${t.slug}`} className="font-semibold hover:text-primary">{t.name}</a>
                </li>
              ))}
            </ul>
          </section>
        )}
        <section className="mt-8" aria-label="Tournaments">
          {result.items.length === 0 ? (
            <EmptyState title="No tournaments yet" description={`Nothing matches in ${city.name} right now.`} />
          ) : (
            <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {result.items.map((t) => (
                <li key={t.id}>
                  <TournamentCard t={t} />
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}
