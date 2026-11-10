import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Avatar } from "@/components/ui/avatar";
import { StatTile } from "@/components/ui/stat-tile";
import { EmptyState } from "@/components/ui/empty-state";
import { ReportProfileButton } from "@/components/domain/public/report-profile";
import { getPlayerByUsername } from "@/lib/public/queries";
import { USERNAME_RE } from "@/lib/validation/profile";

type Props = { params: Promise<{ username: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { username } = await params;
  if (!USERNAME_RE.test(username)) return { title: "Player not found" };
  const p = await getPlayerByUsername(username);
  if (!p) return { title: "Player not found" };
  return {
    title: `${p.profile.full_name} (@${p.profile.username})`,
    description: p.profile.bio ?? `${p.profile.full_name}'s player profile on GroundWar.`,
    alternates: { canonical: `/players/${username}` },
  };
}

export default async function PlayerPage({ params }: Props) {
  const { username } = await params;
  if (!USERNAME_RE.test(username)) notFound();
  const data = await getPlayerByUsername(username);
  if (!data) notFound();
  const { profile } = data;

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-8 px-4 py-8 sm:px-6">
      <header className="flex flex-wrap items-center gap-5">
        <Avatar src={profile.avatar_url} name={profile.full_name ?? "Player"} size="xl" />
        <div className="min-w-0 flex-1">
          <h1 className="font-display text-3xl font-bold text-ink">{profile.full_name}</h1>
          <p className="text-sm text-muted">
            @{profile.username}
            {data.cityName ? ` · ${data.cityName}` : ""}
            {profile.age ? ` · ${profile.age} years` : ""}
          </p>
          {profile.bio && <p className="mt-2 max-w-xl text-ink/90">{profile.bio}</p>}
        </div>
        {profile.id && <ReportProfileButton profileId={profile.id} />}
      </header>

      {data.sports.length > 0 && (
        <section aria-label="Playing profile">
          <h2 className="mb-3 font-display text-2xl font-bold">Playing profile</h2>
          <ul className="grid gap-3 sm:grid-cols-2">
            {data.sports.map((s, i) => (
              <li key={i} className="rounded-card border border-line bg-card p-4">
                <p className="font-semibold">{s.sports?.name}</p>
                <p className="text-sm text-muted">{Object.values(s.details).filter(Boolean).join(" · ") || "No details added"}</p>
              </li>
            ))}
          </ul>
        </section>
      )}

      {profile.show_stats && (
        <section aria-label="Career stats">
          <h2 className="mb-3 font-display text-2xl font-bold">Career stats</h2>
          {!data.cricket && !data.bowling && !data.football ? (
            <EmptyState description="No match stats recorded yet." />
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {data.cricket && (
                <>
                  <StatTile label="Cricket matches" value={Number(data.cricket.matches ?? 0)} />
                  <StatTile label="Runs" value={Number(data.cricket.runs ?? 0)} subValue={`Best ${data.cricket.highest_score ?? 0}`} />
                </>
              )}
              {data.bowling && <StatTile label="Wickets" value={Number(data.bowling.wickets ?? 0)} />}
              {data.football && (
                <>
                  <StatTile label="Football matches" value={Number(data.football.matches ?? 0)} />
                  <StatTile label="Goals" value={Number(data.football.goals ?? 0)} subValue={`${data.football.assists ?? 0} assists`} />
                </>
              )}
            </div>
          )}
        </section>
      )}

      <section aria-label="Tournament history">
        <h2 className="mb-3 font-display text-2xl font-bold">Tournaments</h2>
        {data.tournaments.length === 0 ? (
          <EmptyState description="Not part of any tournament yet." />
        ) : (
          <ul className="divide-y divide-line rounded-card border border-line bg-card">
            {data.tournaments.map((t) => (
              <li key={t.id}>
                <Link href={`/tournaments/${t.slug}`} className="flex min-h-11 items-center justify-between px-4 py-3 hover:text-primary">
                  <span className="font-semibold">{t.name}</span>
                  <span className="text-xs text-muted">{t.sport_name}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
