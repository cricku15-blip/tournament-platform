import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getProfile, getSessionUser } from "@/lib/session";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { WithdrawButton } from "@/components/domain/team/withdraw-button";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "My applications" };

const TABS = ["all", "pending", "approved", "rejected", "withdrawn"] as const;

export default async function MyApplicationsPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const user = await getSessionUser();
  const profile = await getProfile();
  if (!user) return null;
  const sp = await searchParams;
  const tab = TABS.find((t) => t === sp.tab) ?? "all";
  const supabase = await createClient();

  let q = supabase.from("player_applications").select("id, status, reject_reason, created_at, tournament_id").eq("user_id", user.id).order("created_at", { ascending: false }).limit(50);
  if (tab !== "all") q = q.eq("status", tab);
  const { data: apps } = await q;
  const rows = apps ?? [];
  const tids = [...new Set(rows.map((a) => a.tournament_id))];

  const [tours, squads, auctions] = tids.length
    ? await Promise.all([
        supabase.from("public_tournaments").select("id, name, slug, squad_mode, status").in("id", tids),
        supabase.from("squad_members").select("tournament_id, price, team_id, teams(name)").eq("user_id", user.id).in("tournament_id", tids),
        supabase.from("auction_settings").select("tournament_id, scheduled_at, status").in("tournament_id", tids),
      ])
    : [{ data: [] }, { data: [] }, { data: [] }];
  const tmap = new Map((tours.data ?? []).map((t) => [t.id, t]));
  const smap = new Map((squads.data ?? []).map((s) => [s.tournament_id, s]));
  const amap = new Map((auctions.data ?? []).map((a) => [a.tournament_id, a]));

  let city: string | null = null;
  if (profile?.city_id) city = (await supabase.from("cities").select("name").eq("id", profile.city_id).maybeSingle()).data?.name ?? null;

  const state = (a: (typeof rows)[number]) => {
    const t = tmap.get(a.tournament_id);
    const sq = smap.get(a.tournament_id);
    const au = amap.get(a.tournament_id);
    if (a.status === "pending") return { badge: <Badge variant="neutral">Pending</Badge>, note: "Waiting for the organizer.", action: <WithdrawButton id={a.id} tournament={t?.name ?? "this tournament"} /> };
    if (a.status === "rejected") return { badge: <Badge variant="cancelled">Rejected</Badge>, note: a.reject_reason ? `Reason: ${a.reject_reason}` : "The organizer didn't accept this application.", action: null };
    if (a.status === "withdrawn") return { badge: <Badge variant="draft">Withdrawn</Badge>, note: "You withdrew this application.", action: t ? <Button asChild size="sm" variant="secondary"><Link href={`/tournaments/${t.slug}/apply-player`}>Apply again</Link></Button> : null };
    if (sq) return { badge: <Badge variant="open">Picked</Badge>, note: `Team ${(sq.teams as unknown as { name: string } | null)?.name ?? ""}${t?.squad_mode === "auction" && sq.price !== null ? ` · ${sq.price} points` : ""}`, action: null };
    if (t?.squad_mode === "auction") {
      if (au?.status === "completed") return { badge: <Badge variant="neutral">Not picked this time</Badge>, note: "The auction has finished. Better luck next season.", action: null };
      return { badge: <Badge variant="open">Approved</Badge>, note: au?.scheduled_at ? `Auction on ${formatDate(au.scheduled_at)}` : "Auction date to be announced.", action: au?.status === "live" && t ? <Button asChild size="sm"><Link href={`/tournaments/${t.slug}/auction/live`}>Watch auction</Link></Button> : null };
    }
    return { badge: <Badge variant="open">Approved</Badge>, note: "A team manager will add you to a squad.", action: null };
  };

  return (
    <div className="mx-auto w-full max-w-3xl">
      <h1 className="font-display text-3xl font-bold">My applications</h1>
      <nav aria-label="Filter" className="mt-4 flex gap-1 overflow-x-auto">
        {TABS.map((t) => (
          <Link key={t} href={`/player/applications?tab=${t}`} aria-current={t === tab ? "page" : undefined} className={cn("inline-flex min-h-11 shrink-0 items-center rounded-input px-4 text-sm font-semibold capitalize", t === tab ? "bg-primary text-primary-ink" : "text-muted hover:text-ink")}>{t}</Link>
        ))}
      </nav>
      <div className="mt-4">
        {rows.length === 0 ? (
          <EmptyState title="No applications here" description={city ? `Find tournaments in ${city} and apply to play.` : "Find a tournament and apply to play."} action={<Button asChild><Link href="/tournaments">{city ? `Find tournaments in ${city}` : "Find tournaments"}</Link></Button>} />
        ) : (
          <ul className="divide-y divide-line overflow-hidden rounded-card border border-line bg-card">
            {rows.map((a) => {
              const s = state(a);
              const t = tmap.get(a.tournament_id);
              return (
                <li key={a.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      {t ? <Link href={`/tournaments/${t.slug}`} className="truncate font-semibold hover:text-primary">{t.name}</Link> : <span className="font-semibold">Tournament</span>}
                      {s.badge}
                    </div>
                    <p className="text-sm text-muted">{s.note} · applied {formatDate(a.created_at)}</p>
                  </div>
                  {s.action}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
