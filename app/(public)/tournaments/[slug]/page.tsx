import type { Metadata } from "next";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { TeamCard } from "@/components/domain/public/team-card";
import { clientEnv } from "@/lib/env";
import { formatDate, formatDateTime } from "@/lib/format";
import { loadTournament, toLines } from "@/lib/public/page-helpers";
import { FORMAT_LABEL, SQUAD_MODE_LABEL } from "@/lib/public/labels";
import { getAnnouncements, getTournamentTeams } from "@/lib/public/queries";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const t = await loadTournament((await params).slug);
  const description = t.description_short ?? `${t.sport_name} tournament in ${t.city_name}.`;
  return {
    title: `${t.name} | ${t.sport_name} in ${t.city_name}`,
    description,
    alternates: { canonical: `/tournaments/${t.slug}` },
    robots: t.visibility === "public" ? undefined : { index: false },
    openGraph: { title: t.name, description, type: "website", url: `/tournaments/${t.slug}` },
  };
}

export default async function OverviewPage({ params }: Props) {
  const { slug } = await params;
  const t = await loadTournament(slug);
  const [teams, announcements] = await Promise.all([getTournamentTeams(t.id), getAnnouncements(t.id)]);
  const prizes = toLines(t.prizes);
  const awards = toLines(t.individual_awards);
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SportsEvent",
    name: t.name,
    sport: t.sport_name,
    startDate: t.start_date ?? undefined,
    endDate: t.end_date ?? undefined,
    eventStatus: t.status === "cancelled" ? "https://schema.org/EventCancelled" : "https://schema.org/EventScheduled",
    location: { "@type": "Place", name: t.venue_name ?? t.city_name, address: t.venue_address ?? t.city_name },
    description: t.description_short ?? undefined,
    url: `${clientEnv.NEXT_PUBLIC_APP_URL}/tournaments/${t.slug}`,
    organizer: t.organizer_name ? { "@type": "Person", name: t.organizer_name } : undefined,
  };
  const facts: Array<[string, string]> = [
    ["Sport", t.sport_name],
    ["City", t.city_name],
    ["Format", FORMAT_LABEL[t.format] ?? t.format],
    ["Squads", SQUAD_MODE_LABEL[t.squad_mode] ?? t.squad_mode],
    ["Teams", `${t.approved_team_count ?? 0} of ${t.team_count}`],
    ["Players registered", String(t.approved_player_count ?? 0)],
    ...(t.start_date ? ([["Starts", formatDate(t.start_date)]] as Array<[string, string]>) : []),
    ...(t.end_date ? ([["Ends", formatDate(t.end_date)]] as Array<[string, string]>) : []),
    ...(t.entry_fee_info ? ([["Entry", t.entry_fee_info]] as Array<[string, string]>) : []),
  ];

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <div className="flex flex-col gap-8">
        {announcements.length > 0 && (
          <section aria-label="Announcements" className="flex flex-col gap-3">
            {announcements.map((a) => (
              <article key={a.id} className="rounded-card border border-line bg-card p-4">
                <div className="flex items-center gap-2">
                  {a.is_pinned && <Badge variant="neutral">Pinned</Badge>}
                  <h2 className="font-semibold text-ink">{a.title}</h2>
                </div>
                <p className="mt-1 whitespace-pre-line text-sm text-muted">{a.body}</p>
                <p className="mt-2 text-xs text-muted/70">{formatDateTime(a.created_at)}</p>
              </article>
            ))}
          </section>
        )}
        <section>
          <h2 className="mb-3 font-display text-2xl font-bold">About</h2>
          <p className="whitespace-pre-line text-ink/90">{t.description_full ?? t.description_short ?? "No description yet."}</p>
        </section>
        {(prizes.length > 0 || awards.length > 0) && (
          <section>
            <h2 className="mb-3 font-display text-2xl font-bold">Prizes</h2>
            <ul className="list-disc pl-5 text-ink/90">
              {[...prizes, ...awards].map((p, i) => (
                <li key={i}>{p}</li>
              ))}
            </ul>
          </section>
        )}
        {teams.length > 0 && (
          <section>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-display text-2xl font-bold">Teams</h2>
              <Link href={`/tournaments/${t.slug}/teams`} className="text-sm font-semibold text-primary hover:underline">View all</Link>
            </div>
            <ul className="grid gap-3 sm:grid-cols-2">
              {teams.slice(0, 6).map((tm) => (
                <li key={tm.id}>
                  <TeamCard href={`/tournaments/${t.slug}/teams/${tm.slug}`} name={tm.name} logoUrl={tm.logo_url} squadSize={tm.squad_size} homeGround={tm.home_ground} />
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
      <aside className="flex flex-col gap-4">
        <section className="rounded-card border border-line bg-card p-4">
          <h2 className="mb-3 font-display text-lg font-bold">Key facts</h2>
          <dl className="grid grid-cols-2 gap-x-3 gap-y-3 text-sm">
            {facts.map(([k, v]) => (
              <div key={k}>
                <dt className="text-xs text-muted">{k}</dt>
                <dd className="font-semibold text-ink">{v}</dd>
              </div>
            ))}
          </dl>
        </section>
        {(t.venue_name || t.venue_address) && (
          <section className="rounded-card border border-line bg-card p-4">
            <h2 className="mb-2 font-display text-lg font-bold">Venue</h2>
            <p className="text-sm text-ink">{t.venue_name}</p>
            {t.venue_address && (
              <a
                className="text-sm font-semibold text-primary hover:underline"
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${t.venue_name ?? ""} ${t.venue_address}`)}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                {t.venue_address}
              </a>
            )}
          </section>
        )}
        {(t.contact_phone || t.contact_email) && (
          <section className="rounded-card border border-line bg-card p-4">
            <h2 className="mb-2 font-display text-lg font-bold">Organizer contact</h2>
            {t.contact_phone && <p className="text-sm">{t.contact_phone}</p>}
            {t.contact_email && <p className="text-sm">{t.contact_email}</p>}
          </section>
        )}
      </aside>
    </div>
  );
}
