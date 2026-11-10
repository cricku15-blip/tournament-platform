import Link from "next/link";
import { Button } from "@/components/ui/button";
import { TOURNAMENT_STATUSES, type TournamentFilters } from "@/lib/public/filters";
import { STATUS_LABEL } from "@/lib/public/labels";

const field =
  "h-11 w-full rounded-input border border-line bg-card px-3 text-sm text-ink focus-visible:outline-2 focus-visible:outline-primary";

export function FilterBar({
  filters,
  sports,
  cities,
  action = "/tournaments",
  hideCity = false,
}: {
  filters: TournamentFilters;
  sports: Array<{ slug: string; name: string }>;
  cities: Array<{ slug: string; name: string }>;
  action?: string;
  hideCity?: boolean;
}) {
  const hasAny = Object.keys(filters).some((k) => k !== "page");
  const label = (id: string, text: string, child: React.ReactNode) => (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-xs font-semibold text-muted">
        {text}
      </label>
      {child}
    </div>
  );
  return (
    <form method="get" action={action} role="search" aria-label="Filter tournaments" className="sticky top-0 z-30 border-b border-line bg-card/95 py-3 backdrop-blur-xs">
      <div className="mx-auto grid max-w-6xl grid-cols-2 gap-3 px-4 sm:px-6 md:grid-cols-4 lg:grid-cols-8">
        {label("f-q", "Search", <input id="f-q" name="q" defaultValue={filters.q} placeholder="Tournament name" maxLength={60} className={field} />)}
        {label(
          "f-sport",
          "Sport",
          <select id="f-sport" name="sport" defaultValue={filters.sport ?? ""} className={field}>
            <option value="">All sports</option>
            {sports.map((s) => (
              <option key={s.slug} value={s.slug}>{s.name}</option>
            ))}
          </select>
        )}
        {!hideCity &&
          label(
            "f-city",
            "City",
            <select id="f-city" name="city" defaultValue={filters.city ?? ""} className={field}>
              <option value="">All cities</option>
              {cities.map((c) => (
                <option key={c.slug} value={c.slug}>{c.name}</option>
              ))}
            </select>
          )}
        {label(
          "f-status",
          "Status",
          <select id="f-status" name="status" defaultValue={filters.status ?? ""} className={field}>
            <option value="">Any status</option>
            {TOURNAMENT_STATUSES.map((s) => (
              <option key={s} value={s}>{STATUS_LABEL[s]}</option>
            ))}
          </select>
        )}
        {label(
          "f-mode",
          "Squads",
          <select id="f-mode" name="mode" defaultValue={filters.mode ?? ""} className={field}>
            <option value="">Any</option>
            <option value="direct">Direct squads</option>
            <option value="auction">Auction</option>
          </select>
        )}
        {label("f-from", "From", <input id="f-from" type="date" name="from" defaultValue={filters.from} className={field} />)}
        {label("f-to", "To", <input id="f-to" type="date" name="to" defaultValue={filters.to} className={field} />)}
        <div className="flex items-end gap-2">
          <Button type="submit" className="flex-1">Apply</Button>
          {hasAny && (
            <Button asChild variant="ghost">
              <Link href={action}>Clear</Link>
            </Button>
          )}
        </div>
      </div>
    </form>
  );
}
