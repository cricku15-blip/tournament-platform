import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Countdown } from "@/components/domain/auction/countdown";
import { loadTournament } from "@/lib/public/page-helpers";
import { publicDb } from "@/lib/public/client";
import { tournamentData } from "@/lib/public/queries";
import { formatDateTime } from "@/lib/format";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const t = await loadTournament((await params).slug, "/auction");
  return { title: `Auction | ${t.name}`, alternates: { canonical: `/tournaments/${t.slug}/auction` } };
}

export default async function AuctionPage({ params }: Props) {
  const t = await loadTournament((await params).slug, "/auction");
  if (t.squad_mode !== "auction") notFound(); // hidden in direct mode
  const data = await tournamentData(t.id, "auction", async () => {
    const [s, lots, teams] = await Promise.all([
      publicDb.from("auction_settings").select("status, scheduled_at").eq("tournament_id", t.id).maybeSingle(),
      publicDb.from("auction_lots").select("player_id, status, sold_price, sold_team_id").eq("tournament_id", t.id).in("status", ["sold", "unsold"]).limit(500),
      publicDb.from("public_teams").select("id, name").eq("tournament_id", t.id).limit(64),
    ]);
    const ids = (lots.data ?? []).map((l) => l.player_id);
    const names = new Map<string, string>();
    for (let i = 0; i < ids.length; i += 100) {
      const { data } = await publicDb.from("public_profiles").select("id, full_name").in("id", ids.slice(i, i + 100));
      for (const p of data ?? []) if (p.id) names.set(p.id, p.full_name ?? "Player");
    }
    const tm = new Map((teams.data ?? []).map((x) => [x.id, x.name ?? "Team"]));
    return {
      status: s.data?.status ?? "not_scheduled",
      scheduledAt: s.data?.scheduled_at ?? null,
      rows: (lots.data ?? []).map((l) => ({ player: names.get(l.player_id) ?? "Player", team: l.sold_team_id ? tm.get(l.sold_team_id) ?? "" : "", price: l.sold_price, sold: l.status === "sold" })).sort((a, b) => (b.price ?? 0) - (a.price ?? 0)),
    };
  });

  const live = data.status === "live" || data.status === "paused";
  return (
    <div className="flex max-w-3xl flex-col gap-5">
      <section className="rounded-card border border-line bg-card p-6" aria-label="Auction status">
        {data.status === "completed" ? (
          <><Badge variant="completed">Completed</Badge><h2 className="mt-2 font-display text-2xl font-bold">The auction is over</h2></>
        ) : live ? (
          <><Badge variant="live" pulsing>{data.status === "paused" ? "Paused" : "Live now"}</Badge><h2 className="mt-2 font-display text-2xl font-bold">The auction is on</h2><Button asChild className="mt-3"><Link href={`/tournaments/${t.slug}/auction/live`}>Watch live</Link></Button></>
        ) : data.scheduledAt ? (
          <><Badge variant="open">Scheduled</Badge><h2 className="mt-2 font-display text-2xl font-bold">{formatDateTime(data.scheduledAt)}</h2><div className="mt-2"><Countdown at={data.scheduledAt} /></div></>
        ) : (
          <><Badge variant="neutral">Not scheduled</Badge><h2 className="mt-2 font-display text-2xl font-bold">The auction date isn&apos;t set yet</h2></>
        )}
      </section>
      {(data.status === "completed" || data.rows.length > 0) && (
        <section aria-label="Results">
          <h2 className="mb-2 font-display text-xl font-bold">Results</h2>
          <div className="overflow-x-auto rounded-card border border-line bg-card">
            <table className="w-full text-sm">
              <caption className="sr-only">Auction results</caption>
              <thead className="bg-surface text-left text-xs uppercase text-muted"><tr><th scope="col" className="px-3 py-2">Player</th><th scope="col" className="px-3 py-2">Team</th><th scope="col" className="px-3 py-2 text-right">Price</th></tr></thead>
              <tbody className="divide-y divide-line">{data.rows.map((r, i) => <tr key={i}><td className="px-3 py-2 font-semibold">{r.player}</td><td className="px-3 py-2">{r.sold ? r.team : <span className="text-muted">Unsold</span>}</td><td className="px-3 py-2 text-right tabular-nums">{r.sold ? r.price : "–"}</td></tr>)}</tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
