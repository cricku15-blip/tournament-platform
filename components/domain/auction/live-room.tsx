"use client";

import * as React from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { rpc } from "@/lib/rpc";
import { bidBlockReason } from "@/lib/realtime/auction-reducer";
import { bidErrorMessage } from "@/lib/realtime/bid-errors";
import { useAuctionChannel } from "@/lib/realtime/use-auction-channel";
import { BidHistory, LotCard, PurseBar } from "./lot-card";
import { useLotLists } from "./use-lot-lists";
import { cn } from "@/lib/utils";

export function LiveRoom({
  tournamentId, name, slug, squadMax, myTeam, myPlayerId, managersTotal,
}: {
  tournamentId: string; name: string; slug: string; squadMax: number | null;
  myTeam: { id: string; name: string } | null; myPlayerId: string | null; managersTotal: number;
}) {
  const { state, connection, online, loaded, syncError, refresh } = useAuctionChannel(tournamentId, { presenceKey: myTeam ? `team:${myTeam.id}` : undefined });
  const [inFlight, setInFlight] = React.useState(false);
  const [notice, setNotice] = React.useState<{ tone: "error" | "info"; text: string } | null>(null);
  const [tab, setTab] = React.useState<"teams" | "sold" | "upcoming">("teams");
  const [watch, setWatch] = React.useState<Set<string>>(new Set());
  const lists = useLotLists(tournamentId, tab, `${state.counts.sold}-${state.counts.unsold}-${state.counts.upcoming}`);

  React.useEffect(() => {
    try {
      const raw = localStorage.getItem(`watch:${tournamentId}`);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time read of a per-device preference
      if (raw) setWatch(new Set(JSON.parse(raw) as string[]));
    } catch {}
  }, [tournamentId]);

  const mine = myTeam ? state.purses[myTeam.id] ?? null : null;
  const blocked = bidBlockReason({ connected: connection === "connected", status: state.status, lot: state.lot, myTeamId: myTeam?.id ?? null, purse: mine, squadMax, inFlight });
  const isLive = state.status === "live" || state.status === "paused";
  const nextBid = state.lot?.nextBid ?? 0;

  async function bid() {
    if (!state.lot || blocked || inFlight) return;
    setInFlight(true);
    setNotice(null);
    const r = await rpc("place_bid", { p_lot_id: state.lot.id, p_expected_amount: nextBid });
    setInFlight(false);
    if (r.error) {
      if (r.error.code === "bid_changed") {
        await refresh();
        setNotice({ tone: "info", text: "Someone bid first. The current bid has been updated." });
      } else {
        setNotice({ tone: "error", text: bidErrorMessage(r.error.code) });
      }
    }
    // On success we do nothing here: the bid shows up through the broadcast and the next snapshot. We never fake a success.
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 pb-8">
      <header className="flex flex-wrap items-center justify-between gap-2 rounded-card border border-line bg-card p-3">
        <div className="min-w-0">
          <Link href={`/tournaments/${slug}`} className="block truncate font-display text-lg font-bold hover:text-primary">{name}</Link>
        </div>
        <div className="flex items-center gap-2 text-sm">
          {isLive && <Badge variant="live" pulsing>{state.status === "paused" ? "Paused" : "Live"}</Badge>}
          {myTeam && <span className="text-muted" aria-label="Managers online">{online.length} of {managersTotal} managers online</span>}
          <span className={cn("rounded-badge px-2 py-0.5 text-xs font-semibold", connection === "connected" ? "bg-primary/15 text-primary" : "bg-danger/15 text-danger")} role="status">
            {connection === "connected" ? "Connected" : connection === "offline" ? "Offline" : "Reconnecting..."}
          </span>
        </div>
      </header>

      <div className="sr-only" aria-live="polite" aria-atomic="true">{state.liveMessage}</div>

      {!loaded ? (
        <div className="h-64 animate-pulse rounded-card bg-surface" aria-label="Loading auction" />
      ) : (
        <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
          <div className="flex flex-col gap-4">
            {state.status === "paused" && <p role="status" className="rounded-input border border-floodlight/60 bg-floodlight/15 p-3 text-center font-semibold">Auction paused. Bidding resumes shortly.</p>}
            <LotCard state={state} highlightPlayerId={myPlayerId} />

            {myTeam ? (
              <div className="flex flex-col gap-2">
                <Button size="lg" className="h-16 text-xl" onClick={bid} disabled={Boolean(blocked)} loading={inFlight} aria-describedby="bid-reason">
                  {blocked && !inFlight ? blocked : state.lot ? `Bid ${nextBid}` : "Bid"}
                </Button>
                <p id="bid-reason" className="sr-only">{blocked ?? "You can bid now"}</p>
                {notice && <p role={notice.tone === "error" ? "alert" : "status"} className={cn("text-center text-sm", notice.tone === "error" ? "text-danger" : "text-muted")}>{notice.text}</p>}
              </div>
            ) : (
              <p className="rounded-card border border-line bg-card p-4 text-center font-semibold">Watching live</p>
            )}

            {myTeam && mine && (
              <section aria-label="My team">
                <PurseBar name={`${myTeam.name} (you)`} total={mine.total} spent={mine.spent} squad={mine.squad} squadMax={squadMax} active />
              </section>
            )}
            {syncError && <p role="status" className="text-center text-xs text-muted">Having trouble refreshing. Retrying…</p>}
          </div>

          <div className="flex flex-col gap-4">
            <section aria-label="Bid history">
              <h2 className="mb-2 font-display text-lg font-bold">Bid history</h2>
              <BidHistory state={state} />
            </section>
            <section aria-label="Auction lists">
              <div role="tablist" className="mb-2 flex gap-1">
                {(["teams", "sold", "upcoming"] as const).map((t) => (
                  <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)} className={cn("min-h-11 flex-1 rounded-input px-3 text-sm font-semibold capitalize", tab === t ? "bg-primary text-primary-ink" : "border border-line text-muted")}>
                    {t === "sold" ? `Sold (${state.counts.sold})` : t === "upcoming" ? `Upcoming (${state.counts.upcoming})` : "Teams"}
                  </button>
                ))}
              </div>
              <div role="tabpanel" className="flex flex-col gap-2">
                {tab === "teams" && Object.entries(state.purses).map(([id, p]) => <PurseBar key={id} name={p.name} total={p.total} spent={p.spent} squad={p.squad} squadMax={squadMax} active={state.lot?.currentTeamId === id} />)}
                {tab !== "teams" && (lists.loading ? <p className="text-sm text-muted">Loading…</p> : lists.items.length === 0 ? <p className="text-sm text-muted">Nothing here yet.</p> : (
                  <ul className="divide-y divide-line rounded-card border border-line bg-card">
                    {lists.items.map((p) => (
                      <li key={p.id} className="flex items-center justify-between gap-2 px-3 py-2 text-sm">
                        <span className="min-w-0 truncate">{watch.has(p.id) && <span aria-label="On your watchlist">★ </span>}<span className="font-semibold">{p.name}</span>{p.category ? <span className="text-muted"> · {p.category}</span> : null}</span>
                        <span className="shrink-0 tabular-nums">{tab === "sold" ? `${p.team ?? ""} ${p.price ?? ""}` : `Base ${p.basePrice}`}</span>
                      </li>
                    ))}
                  </ul>
                ))}
              </div>
            </section>
          </div>
        </div>
      )}
    </div>
  );
}
