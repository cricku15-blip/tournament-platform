"use client";

import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import type { AuctionState } from "@/lib/realtime/auction-reducer";
import { cn } from "@/lib/utils";

/** Flashes amber for 400 ms whenever the value changes (reduced-motion users get no flash). */
export function Flash({ value, children, className }: { value: unknown; children: React.ReactNode; className?: string }) {
  const [on, setOn] = React.useState(false);
  const first = React.useRef(true);
  React.useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    setOn(true);
    const t = setTimeout(() => setOn(false), 400);
    return () => clearTimeout(t);
  }, [value]);
  return <span className={cn("inline-block rounded-input px-2 transition-colors motion-reduce:transition-none", on && "bg-floodlight/40", className)}>{children}</span>;
}

export function LotCard({ state, highlightPlayerId }: { state: AuctionState; highlightPlayerId?: string | null }) {
  const { lot, lastResult, announcement, status } = state;
  if (!lot) {
    return (
      <section className="rounded-card border border-line bg-card p-6 text-center" aria-label="On the block">
        {status === "completed" ? (
          <p className="font-display text-2xl font-bold">The auction has ended</p>
        ) : lastResult ? (
          <div className="sold-pop motion-reduce:animate-none">
            <p className="font-display text-3xl font-bold text-primary">{lastResult.kind === "sold" ? "SOLD" : "UNSOLD"}</p>
            <p className="mt-1 text-lg font-semibold">{lastResult.playerName}</p>
            {lastResult.kind === "sold" && <p className="text-muted">to {lastResult.teamName} for {lastResult.price} points</p>}
          </div>
        ) : (
          <p className="text-muted">{status === "live" ? "Waiting for the auctioneer to bring up the next player." : "The auction hasn't started yet."}</p>
        )}
      </section>
    );
  }
  const you = highlightPlayerId && highlightPlayerId === lot.playerId;
  return (
    <section className={cn("rounded-card border bg-card p-6 text-center", you ? "border-floodlight" : "border-line")} aria-label="On the block">
      {you && <p className="mb-2 font-display text-xl font-bold text-floodlight">You&apos;re up!</p>}
      <div className="flex flex-col items-center gap-2">
        <Avatar name={lot.playerName} size="xl" />
        <h2 className="font-display text-3xl font-bold">{lot.playerName}</h2>
        <div className="flex gap-2">
          {lot.category && <Badge variant="neutral">{lot.category}</Badge>}
          <Badge variant="neutral">Base {lot.basePrice}</Badge>
        </div>
      </div>
      <div className="mt-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">{lot.currentBid === null ? "No bids yet" : "Current bid"}</p>
        <p className="font-display text-6xl font-bold tabular-nums sm:text-7xl">
          <Flash value={lot.currentBid}>{lot.currentBid ?? lot.basePrice}</Flash>
        </p>
        <p className="mt-1 min-h-6 text-lg">{lot.currentTeamName ? <>held by <strong>{lot.currentTeamName}</strong></> : lot.biddingOpen ? "Open for bids" : "Bidding not open yet"}</p>
        {announcement && <p className="mt-2 font-display text-2xl font-bold text-floodlight">{announcement === "going_once" ? "Going once…" : "Going twice…"}</p>}
      </div>
    </section>
  );
}

export function BidHistory({ state }: { state: AuctionState }) {
  if (state.bids.length === 0) return <p className="text-sm text-muted">No bids on this player yet.</p>;
  return (
    <ol className="divide-y divide-line rounded-card border border-line bg-card">
      {state.bids.map((b, i) => (
        <li key={b.id} className={cn("flex items-center justify-between px-4 py-2 text-sm", i === 0 && "font-semibold")}>
          <span>{b.teamName}</span>
          <span className="font-display text-lg tabular-nums">{b.amount}</span>
        </li>
      ))}
    </ol>
  );
}

export function PurseBar({ name, total, spent, squad, squadMax, active }: { name: string; total: number; spent: number; squad: number; squadMax: number | null; active?: boolean }) {
  const left = total - spent;
  const pct = total > 0 ? Math.max(0, Math.min(100, (left / total) * 100)) : 0;
  return (
    <div className={cn("rounded-input border p-3", active ? "border-primary" : "border-line")}>
      <div className="flex items-center justify-between text-sm">
        <span className="truncate font-semibold">{name}</span>
        <span className="tabular-nums text-muted">{squad}{squadMax ? `/${squadMax}` : ""} players</span>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-surface" role="progressbar" aria-label={`${name} purse left`} aria-valuemin={0} aria-valuemax={total} aria-valuenow={left}>
        <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
      </div>
      <p className="mt-1 text-xs text-muted tabular-nums">{left} of {total} points left</p>
    </div>
  );
}
