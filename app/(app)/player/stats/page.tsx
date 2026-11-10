import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getProfile, getSessionUser } from "@/lib/session";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { StatTile } from "@/components/ui/stat-tile";
import { PlayerChart } from "@/components/domain/public/player-chart";
import { ShareButtons } from "@/components/domain/public/share-buttons";
import { clientEnv } from "@/lib/env";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "My stats" };

export default async function MyStatsPage({ searchParams }: { searchParams: Promise<{ sport?: string }> }) {
  const user = await getSessionUser();
  const profile = await getProfile();
  if (!user) return null;
  const sp = await searchParams;
  const sport = sp.sport === "football" ? "football" : "cricket";
  const supabase = await createClient();
  const me = user.id;

  const [bat, bowl, foot, tBat, tBowl, tFoot, batRows, evRows] = await Promise.all([
    supabase.from("player_cricket_career").select("matches, runs, highest_score").eq("player_id", me).maybeSingle(),
    supabase.from("player_bowling_career").select("wickets").eq("player_id", me).maybeSingle(),
    supabase.from("player_football_career").select("matches, goals, assists, yellow_cards, red_cards").eq("player_id", me).maybeSingle(),
    supabase.from("tournament_batting_stats").select("tournament_id, matches, runs, highest_score").eq("player_id", me).limit(50),
    supabase.from("tournament_bowling_stats").select("tournament_id, wickets").eq("player_id", me).limit(50),
    supabase.from("tournament_football_stats").select("tournament_id, matches, goals, assists").eq("player_id", me).limit(50),
    supabase.from("cricket_batting").select("runs, match_id, matches(scheduled_at, result_published_at)").eq("player_id", me).limit(60),
    supabase.from("football_events").select("match_id, type, matches(scheduled_at, result_published_at)").eq("player_id", me).in("type", ["goal", "penalty_goal"]).limit(200),
  ]);

  const tids = [...new Set([...(tBat.data ?? []).map((r) => r.tournament_id), ...(tFoot.data ?? []).map((r) => r.tournament_id)].filter((x): x is string => !!x))];
  const { data: tours } = tids.length ? await supabase.from("public_tournaments").select("id, name, slug").in("id", tids) : { data: [] };
  const tname = (id: string | null) => tours?.find((t) => t.id === id)?.name ?? "Tournament";

  type MatchJoin = { scheduled_at: string | null; result_published_at: string | null } | null;
  const series =
    sport === "cricket"
      ? (batRows.data ?? []).map((r) => ({ at: (r.matches as unknown as MatchJoin)?.scheduled_at ?? "", pub: (r.matches as unknown as MatchJoin)?.result_published_at, value: r.runs }))
      : Object.values(
          (evRows.data ?? []).reduce<Record<string, { at: string; pub: string | null | undefined; value: number }>>((acc, r) => {
            const m = r.matches as unknown as MatchJoin;
            acc[r.match_id] = { at: m?.scheduled_at ?? "", pub: m?.result_published_at, value: (acc[r.match_id]?.value ?? 0) + 1 };
            return acc;
          }, {})
        );
  const chart = series.filter((x) => x.pub).sort((a, b) => a.at.localeCompare(b.at)).slice(-12).map((x, i) => ({ label: `M${i + 1}`, value: x.value }));

  const hasData = sport === "cricket" ? Boolean(bat.data || bowl.data) : Boolean(foot.data);
  const publicUrl = profile?.username ? `${clientEnv.NEXT_PUBLIC_APP_URL}/players/${profile.username}` : null;

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-3xl font-bold">My stats</h1>
        <nav aria-label="Sport" className="flex gap-1">
          {(["cricket", "football"] as const).map((s) => (
            <Link key={s} href={`/player/stats?sport=${s}`} aria-current={s === sport ? "page" : undefined} className={cn("inline-flex min-h-11 items-center rounded-input px-4 text-sm font-semibold capitalize", s === sport ? "bg-primary text-primary-ink" : "text-muted hover:text-ink")}>{s}</Link>
          ))}
        </nav>
      </div>

      {!hasData ? (
        <EmptyState title={`No ${sport} stats yet`} description="Your numbers appear here after organizers publish results from matches you play." action={<Button asChild><Link href="/tournaments">Find tournaments</Link></Button>} />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {sport === "cricket" ? (
              <>
                <StatTile label="Matches" value={Number(bat.data?.matches ?? 0)} />
                <StatTile label="Runs" value={Number(bat.data?.runs ?? 0)} />
                <StatTile label="Wickets" value={Number(bowl.data?.wickets ?? 0)} />
                <StatTile label="Best score" value={Number(bat.data?.highest_score ?? 0)} />
              </>
            ) : (
              <>
                <StatTile label="Matches" value={Number(foot.data?.matches ?? 0)} />
                <StatTile label="Goals" value={Number(foot.data?.goals ?? 0)} />
                <StatTile label="Assists" value={Number(foot.data?.assists ?? 0)} />
                <StatTile label="Cards" value={`${foot.data?.yellow_cards ?? 0}Y ${foot.data?.red_cards ?? 0}R`} />
              </>
            )}
          </div>

          {chart.length > 0 && (
            <section aria-label="Per match" className="rounded-card border border-line bg-card p-5">
              <h2 className="mb-3 font-display text-xl font-bold">{sport === "cricket" ? "Runs per match" : "Goals per match"} (last {chart.length})</h2>
              <PlayerChart data={chart} label={sport === "cricket" ? "Runs per match" : "Goals per match"} />
            </section>
          )}

          <section aria-label="By tournament" className="rounded-card border border-line bg-card p-5">
            <h2 className="mb-3 font-display text-xl font-bold">By tournament</h2>
            <table className="w-full text-sm">
              <caption className="sr-only">Stats by tournament</caption>
              <thead className="text-left text-xs uppercase text-muted"><tr><th scope="col" className="pb-2">Tournament</th><th scope="col" className="pb-2 text-right">Matches</th><th scope="col" className="pb-2 text-right">{sport === "cricket" ? "Runs" : "Goals"}</th><th scope="col" className="pb-2 text-right">{sport === "cricket" ? "Wickets" : "Assists"}</th></tr></thead>
              <tbody className="divide-y divide-line">
                {(sport === "cricket" ? tBat.data ?? [] : tFoot.data ?? []).map((r, i) => {
                  const tid = r.tournament_id;
                  const extra = sport === "cricket" ? (tBowl.data ?? []).find((b) => b.tournament_id === tid)?.wickets ?? 0 : (r as { assists?: number }).assists ?? 0;
                  const main = sport === "cricket" ? (r as { runs?: number }).runs : (r as { goals?: number }).goals;
                  return <tr key={`${tid}${i}`}><td className="py-2">{tname(tid)}</td><td className="py-2 text-right tabular-nums">{String(r.matches ?? 0)}</td><td className="py-2 text-right tabular-nums">{String(main ?? 0)}</td><td className="py-2 text-right tabular-nums">{String(extra)}</td></tr>;
                })}
              </tbody>
            </table>
          </section>
        </>
      )}

      <section className="rounded-card border border-line bg-card p-5" aria-label="Share">
        <h2 className="mb-1 font-display text-xl font-bold">Share your profile</h2>
        {publicUrl ? (
          <>
            <p className="mb-3 text-sm text-muted">{profile?.show_stats ? "Your stats are visible on your public profile." : "Your stats are hidden on your public profile. Turn them on in Profile > Visibility."}</p>
            <ShareButtons url={publicUrl} title={`${profile?.full_name ?? "Player"} on GroundWar`} />
          </>
        ) : (
          <p className="text-sm text-muted">Set a username in your profile to get a public link. <span className="sr-only">{formatDate(new Date())}</span></p>
        )}
      </section>
    </div>
  );
}
