import type { Metadata } from "next";
import Link from "next/link";
import { FilterBar } from "@/components/domain/public/filter-bar";
import { TournamentCard } from "@/components/domain/public/tournament-card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { filtersToQuery, parseFilters } from "@/lib/public/filters";
import { getCities, getSports, listTournaments } from "@/lib/public/queries";

export const metadata: Metadata = {
  title: "Find local sports tournaments",
  description: "Browse cricket and football tournaments in your city. Filter by sport, status and date.",
  alternates: { canonical: "/tournaments" },
};

export default async function TournamentsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const filters = parseFilters(await searchParams);
  const [cities, sports, result] = await Promise.all([getCities(), getSports(), listTournaments(filters)]);
  const page = filters.page ?? 1;

  return (
    <>
      <FilterBar filters={filters} sports={sports} cities={cities} />
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <h1 className="mb-6 font-display text-3xl font-bold text-ink sm:text-4xl">Tournaments</h1>

        {result.error ? (
          <EmptyState
            title="We couldn't load tournaments"
            description="Something went wrong on our side. Please try again in a moment."
            action={
              <Button asChild variant="secondary">
                <Link href={`/tournaments${filtersToQuery(filters)}`}>Try again</Link>
              </Button>
            }
          />
        ) : result.items.length === 0 ? (
          <EmptyState
            title="No tournaments match"
            description="Try removing a filter, or check back soon."
            action={
              <Button asChild variant="secondary">
                <Link href="/tournaments">Clear filters</Link>
              </Button>
            }
          />
        ) : (
          <>
            <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {result.items.map((t, i) => (
                <li key={t.id}>
                  <TournamentCard t={t} priority={i < 3} />
                </li>
              ))}
            </ul>
            <nav aria-label="Pagination" className="mt-8 flex items-center justify-center gap-3">
              {page > 1 && (
                <Button asChild variant="secondary">
                  <Link href={`/tournaments${filtersToQuery(filters, { page: page - 1 })}`} rel="prev">Previous</Link>
                </Button>
              )}
              {result.hasMore && (
                <Button asChild variant="secondary">
                  <Link href={`/tournaments${filtersToQuery(filters, { page: page + 1 })}`} rel="next">Load more</Link>
                </Button>
              )}
            </nav>
          </>
        )}
      </div>
    </>
  );
}
