"use client";

import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/toast";
import { createClient } from "@/lib/supabase/browser";
import { rpc } from "@/lib/rpc";
import { useAuctionChannel } from "@/lib/realtime/use-auction-channel";
import { BidHistory, Flash, PurseBar } from "./lot-card";
import { useLotLists } from "./use-lot-lists";
import { cn } from "@/lib/utils";

type Filter = "upcoming" | "sold" | "unsold";

export function AuctionConsole({ tournamentId, name, squadMax, teams }: { tournamentId: string; name: string; squadMax: number | null; teams: Array<{ id: string; name: string; hasManager: boolean }> }) {
  const { state, connection, online, loaded, refresh } = useAuctionChannel(tournamentId, { presenceKey: "auctioneer" });
  const [filter, setFilter] = React.useState<Filter>("upcoming");
  const [q, setQ] = React.useState("");
  const [busy, setBusy] = React.useState<string | null>(null);
  const [undoOpen, setUndoOpen] = React.useState(false);
  const [reason, setReason] = React.useState("");
  const [endOpen, setEndOpen] = React.useState(false);
  const [price, setPrice] = React.useState("");
  const [order, setOrder] = React.useState<string[] | null>(null);
  const [dragId, setDragId] = React.useState<string | null>(null);
  const lists = useLotLists(tournamentId, "all", `${state.counts.sold}-${state.counts.unsold}-${state.counts.upcoming}-${state.lot?.id ?? ""}`);
  const lot = state.lot;
  const live = state.status === "live";
  const paused = state.status === "paused";

  const queue = React.useMemo(() => {
    const base = lists.items.filter((i) => (filter === "upcoming" ? i.status === "upcoming" : filter === "sold" ? i.status === "sold" : i.status === "unsold"));
    const ordered = order && filter === "upcoming" ? [...base].sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id)) : base;
    return ordered.filter((i) => !q || i.name.toLowerCase().includes(q.toLowerCase()));
  }, [lists.items, filter, q, order]);

  async function act<T>(key: string, fn: () => Promise<{ error: { message: string } | null; data?: T }>, okMsg?: string) {
    setBusy(key);
    const r = await fn();
    setBusy(null);
    if (r.error) {
      toast({ title: r.error.message });
      return false;
    }
    if (okMsg) toast({ title: okMsg });
    void refresh();
    return true;
  }

  const select = (playerId: string) => act("sel", () => rpc("select_lot", { p_tid: tournamentId, p_player_id: playerId }));
  const open = () => lot && act("open", () => rpc("open_bidding", { p_lot_id: lot.id }));
  const announce = (k: "going_once" | "going_twice") => lot && act(k, () => rpc("announce_lot", { p_lot_id: lot.id, p_kind: k }));
  const sold = () => lot && act("sold", () => rpc("close_lot_sold", { p_lot_id: lot.id }));
  const unsold = () => lot && act("unsold", () => rpc("close_lot_unsold", { p_lot_id: lot.id }));
  const pause = () => act("pause", () => rpc("pause_auction", { p_tid: tournamentId }), "Auction paused");
  const resume = () => act("resume", () => rpc("resume_auction", { p_tid: tournamentId }), "Auction resumed");

  async function undo() {
    if (!lot) return;
    if (await act("undo", () => rpc("undo_last_bid", { p_lot_id: lot.id, p_reason: reason }), "Last bid undone")) {
      setUndoOpen(false);
      setReason("");
    }
  }

  async function saveBase() {
    if (!lot) return;
    const n = Number(price);
    if (!Number.isInteger(n) || n < 0) return toast({ title: "Enter a whole number of points." });
    const { error } = await createClient().from("pool_players").update({ base_price: n }).eq("tournament_id", tournamentId).eq("user_id", lot.playerId);
    if (error) return toast({ title: "Couldn't change the base price." });
    toast({ title: "Base price updated" });
    setPrice("");
    void refresh();
  }

  async function drop(targetId: string) {
    if (!dragId || dragId === targetId) return;
    const ids = (order ?? queue.map((i) => i.id)).slice();
    const from = ids.indexOf(dragId);
    const to = ids.indexOf(targetId);
    if (from < 0 || to < 0) return;
    ids.splice(to, 0, ...ids.splice(from, 1));
    setOrder(ids);
    setDragId(null);
    const supabase = createClient();
    const results = await Promise.all(ids.map((id, i) => supabase.from("pool_players").update({ sequence_no: i + 1 }).eq("tournament_id", tournamentId).eq("user_id", id)));
    if (results.some((r) => r.error)) toast({ title: "Couldn't save the new order." });
  }

  const nextBid = lot?.nextBid ?? 0;
  const offlineManagers = teams.filter((t) => t.hasManager && !online.includes(`team:${t.id}`));

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-4">
      <header className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-line bg-card p-3">
        <div>
          <h1 className="font-display text-2xl font-bold">{name}: auctioneer console</h1>
          <p className="text-sm text-muted">{state.counts.sold} sold · {state.counts.unsold} unsold · {state.counts.upcoming} to go</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {live && <Badge variant="live" pulsing>Live</Badge>}
          {paused && <Badge variant="neutral">Paused</Badge>}
          <span className={cn("rounded-badge px-2 py-0.5 text-xs font-semibold", connection === "connected" ? "bg-primary/15 text-primary" : "bg-danger/15 text-danger")} role="status">{connection === "connected" ? "Connected" : connection === "offline" ? "Offline" : "Reconnecting..."}</span>
          {live && <Button variant="secondary" size="sm" loading={busy === "pause"} onClick={pause}>Pause</Button>}
          {paused && <Button size="sm" loading={busy === "resume"} onClick={resume}>Resume</Button>}
          {(live || paused) && <Button variant="destructive" size="sm" onClick={() => setEndOpen(true)} disabled={Boolean(lot)} title={lot ? "Close the current lot first" : undefined}>End auction</Button>}
        </div>
      </header>
      <div className="sr-only" aria-live="polite">{state.liveMessage}</div>
      {offlineManagers.length > 0 && live && <p role="status" className="rounded-input border border-floodlight/60 bg-floodlight/15 p-2 text-sm">Offline: {offlineManagers.map((t) => t.name).join(", ")}</p>}

      {!loaded ? <div className="h-72 animate-pulse rounded-card bg-surface" /> : (
        <div className="grid gap-4 lg:grid-cols-[300px_1fr_300px]">
          <section aria-label="Lot queue" className="flex flex-col gap-2 rounded-card border border-line bg-card p-3">
            <h2 className="font-display text-lg font-bold">Queue</h2>
            <Input aria-label="Search players" placeholder="Search" value={q} onChange={(e) => setQ(e.target.value)} />
            <div className="flex gap-1">
              {(["upcoming", "sold", "unsold"] as const).map((f) => (
                <button key={f} onClick={() => setFilter(f)} aria-pressed={filter === f} className={cn("min-h-11 flex-1 rounded-input px-2 text-xs font-semibold capitalize", filter === f ? "bg-primary text-primary-ink" : "border border-line text-muted")}>{f}</button>
              ))}
            </div>
            <ul className="max-h-[60vh] divide-y divide-line overflow-y-auto">
              {queue.map((p) => (
                <li key={p.id} draggable={filter === "upcoming" && !lot} onDragStart={() => setDragId(p.id)} onDragOver={(e) => e.preventDefault()} onDrop={() => drop(p.id)} className="flex items-center justify-between gap-2 py-2 text-sm">
                  <span className="min-w-0"><span className="block truncate font-semibold">{p.name}</span><span className="text-xs text-muted">{p.category ?? "No category"} · base {p.basePrice}{p.status === "sold" ? ` · ${p.team} ${p.price}` : ""}</span></span>
                  {(p.status === "upcoming" || p.status === "unsold") && <Button size="sm" variant="secondary" disabled={Boolean(lot) || !live} loading={busy === "sel"} onClick={() => select(p.id)}>Select</Button>}
                </li>
              ))}
              {queue.length === 0 && <li className="py-4 text-center text-sm text-muted">{lists.loading ? "Loading…" : "Nothing here."}</li>}
            </ul>
          </section>

          <section aria-label="On the block" className="flex flex-col gap-4 rounded-card border border-line bg-card p-5 text-center">
            {lot ? (
              <>
                <div>
                  <h2 className="font-display text-3xl font-bold">{lot.playerName}</h2>
                  <p className="text-sm text-muted">{lot.category ?? "No category"} · base {lot.basePrice}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted">{lot.currentBid === null ? "No bids yet" : "Current bid"}</p>
                  <p className="font-display text-7xl font-bold tabular-nums"><Flash value={lot.currentBid}>{lot.currentBid ?? lot.basePrice}</Flash></p>
                  <p className="text-lg">{lot.currentTeamName ? <>held by <strong>{lot.currentTeamName}</strong></> : lot.biddingOpen ? "Waiting for the first bid" : "Bidding is not open"}</p>
                  {state.announcement && <p className="mt-1 font-display text-xl font-bold text-floodlight">{state.announcement === "going_once" ? "Going once…" : "Going twice…"}</p>}
                  {lot.biddingOpen && <p className="text-sm text-muted">Next valid bid: {nextBid}</p>}
                </div>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {!lot.biddingOpen && <Button size="lg" className="col-span-2 sm:col-span-3" loading={busy === "open"} onClick={open} disabled={!live}>Open bidding</Button>}
                  {lot.biddingOpen && (
                    <>
                      <Button variant="secondary" loading={busy === "going_once"} onClick={() => announce("going_once")}>Going once</Button>
                      <Button variant="secondary" loading={busy === "going_twice"} onClick={() => announce("going_twice")}>Going twice</Button>
                      <Button variant="secondary" onClick={() => setUndoOpen(true)} disabled={!lot.currentBid}>Undo last bid</Button>
                      <Button size="lg" className="col-span-2" loading={busy === "sold"} onClick={sold} disabled={lot.currentBid === null}>SOLD</Button>
                    </>
                  )}
                  <Button variant="destructive" loading={busy === "unsold"} onClick={unsold}>Unsold</Button>
                </div>
                {!lot.biddingOpen && (
                  <div className="flex items-end justify-center gap-2 text-left">
                    <label className="text-sm">Edit base price<Input inputMode="numeric" value={price} placeholder={String(lot.basePrice)} onChange={(e) => setPrice(e.target.value.replace(/\D/g, ""))} /></label>
                    <Button variant="secondary" onClick={saveBase} disabled={!price}>Save</Button>
                  </div>
                )}
              </>
            ) : state.lastResult ? (
              <div className="sold-pop"><p className="font-display text-4xl font-bold text-primary">{state.lastResult.kind === "sold" ? "SOLD" : "UNSOLD"}</p><p className="text-lg font-semibold">{state.lastResult.playerName}</p>{state.lastResult.kind === "sold" && <p className="text-muted">to {state.lastResult.teamName} for {state.lastResult.price}</p>}<p className="mt-3 text-sm text-muted">Pick the next player from the queue.</p></div>
            ) : (
              <p className="py-10 text-muted">{state.status === "completed" ? "The auction has ended." : live ? "Pick a player from the queue." : "The auction isn't live. Start it from the Auction tab."}</p>
            )}
            <div className="text-left"><h3 className="mb-2 font-semibold">Bid history</h3><BidHistory state={state} /></div>
          </section>

          <section aria-label="Teams" className="flex flex-col gap-2 rounded-card border border-line bg-card p-3">
            <h2 className="font-display text-lg font-bold">Teams</h2>
            {teams.map((t) => {
              const p = state.purses[t.id];
              const onl = online.includes(`team:${t.id}`);
              const canBid = p && lot?.biddingOpen && nextBid <= p.total - p.spent && (squadMax === null || p.squad < squadMax);
              return (
                <div key={t.id} className="relative">
                  <span className="absolute right-2 top-2 flex gap-1" aria-hidden>
                    <span title={onl ? "Online" : "Offline"} className={cn("h-2.5 w-2.5 rounded-full", onl ? "bg-primary" : "bg-muted/40")} />
                    <span title={canBid ? "Can bid" : "Cannot bid"} className={cn("h-2.5 w-2.5 rounded-full", canBid ? "bg-floodlight" : "bg-muted/40")} />
                  </span>
                  <PurseBar name={`${t.name}${onl ? "" : " (offline)"}`} total={p?.total ?? 0} spent={p?.spent ?? 0} squad={p?.squad ?? 0} squadMax={squadMax} active={lot?.currentTeamId === t.id} />
                </div>
              );
            })}
          </section>
        </div>
      )}

      <ConfirmDialog open={undoOpen} onOpenChange={setUndoOpen} title="Undo the last bid?" description="Everyone sees the previous bid restored. A reason is required and is saved in the audit log." confirmLabel="Undo bid" variant="destructive" onConfirm={async () => { if (reason.trim().length < 3) { toast({ title: "Write a reason first." }); return; } await undo(); }} />
      {undoOpen && (
        <div className="mx-auto w-full max-w-md rounded-card border border-line bg-card p-3">
          <label className="text-sm font-semibold" htmlFor="undo-reason">Reason (required)</label>
          <Input id="undo-reason" value={reason} maxLength={200} onChange={(e) => setReason(e.target.value)} />
        </div>
      )}
      <ConfirmDialog open={endOpen} onOpenChange={setEndOpen} title="End the auction?" description="Players still in the queue are marked unsold. This can't be undone." confirmLabel="End auction" variant="destructive" onConfirm={async () => { await act("end", () => rpc("end_auction", { p_tid: tournamentId }), "Auction ended"); }} />
    </div>
  );
}
