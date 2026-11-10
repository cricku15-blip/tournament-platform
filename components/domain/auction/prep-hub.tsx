"use client";

import * as React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Countdown } from "./countdown";
import { cn } from "@/lib/utils";

export interface PoolItem { id: string; name: string; category: string | null; base: number; status: string }

const OPEN_BEFORE_MS = 15 * 60 * 1000;

export function PrepHub({
  tournamentId, slug, teamName, purse, reserveNeeded, squadMin, squadMax, limits, categories, scheduledAt, auctionStatus, pool, bought, owned,
}: {
  tournamentId: string; slug: string; teamName: string; purse: { total: number; spent: number } | null; reserveNeeded: number | null;
  squadMin: number | null; squadMax: number | null; limits: Record<string, number>; categories: string[]; scheduledAt: string | null; auctionStatus: string;
  pool: PoolItem[]; bought: Array<{ name: string; price: number | null; category: string | null }>; owned: Record<string, number>;
}) {
  const key = `watch:${tournamentId}`;
  const noteKey = `notes:${tournamentId}`;
  const [watch, setWatch] = React.useState<Set<string>>(new Set());
  const [notes, setNotes] = React.useState<Record<string, string>>({});
  const [cat, setCat] = React.useState("");
  const [only, setOnly] = React.useState(false);
  const [q, setQ] = React.useState("");
  const [open, setOpen] = React.useState<string | null>(null);

  React.useEffect(() => {
    try {
      const w = localStorage.getItem(key);
      const n = localStorage.getItem(noteKey);
      /* eslint-disable react-hooks/set-state-in-effect -- one-time read of per-device preferences */
      if (w) setWatch(new Set(JSON.parse(w) as string[]));
      if (n) setNotes(JSON.parse(n) as Record<string, string>);
      /* eslint-enable react-hooks/set-state-in-effect */
    } catch {}
  }, [key, noteKey]);

  const toggle = (id: string) =>
    setWatch((cur) => {
      const n = new Set(cur);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      try { localStorage.setItem(key, JSON.stringify([...n])); } catch {}
      return n;
    });
  const saveNote = (id: string, v: string) =>
    setNotes((cur) => {
      const n = { ...cur, [id]: v.slice(0, 300) };
      try { localStorage.setItem(noteKey, JSON.stringify(n)); } catch {}
      return n;
    });

  const live = auctionStatus === "live" || auctionStatus === "paused";
  const done = auctionStatus === "completed";
  const shown = pool.filter((p) => (!cat || p.category === cat) && (!only || watch.has(p.id)) && (!q || p.name.toLowerCase().includes(q.toLowerCase())));
  const left = purse ? purse.total - purse.spent : 0;

  return (
    <div className="flex flex-col gap-5">
      <section className="rounded-card border border-line bg-card p-5" aria-label="Auction date">
        <h2 className="font-display text-xl font-bold">Auction</h2>
        {done ? <p className="text-sm text-muted">The auction is finished. Your squad is below.</p> : live ? (
          <Button asChild className="mt-2"><Link href={`/tournaments/${slug}/auction/live`}>Enter auction room</Link></Button>
        ) : scheduledAt ? (
          <div className="mt-1">
            <Countdown at={scheduledAt}>
              {(ms) => (
                <div className="mt-2 flex flex-wrap items-center gap-3">
                  <Button asChild={ms <= OPEN_BEFORE_MS} disabled={ms > OPEN_BEFORE_MS}>
                    {ms <= OPEN_BEFORE_MS ? <Link href={`/tournaments/${slug}/auction/live`}>Enter auction room</Link> : <span>Enter auction room</span>}
                  </Button>
                  {ms > OPEN_BEFORE_MS && <p className="text-sm text-muted">Opens 15 minutes before the start.</p>}
                </div>
              )}
            </Countdown>
          </div>
        ) : <p className="text-sm text-muted">The organizer hasn&apos;t set the auction date yet.</p>}
      </section>

      <div className="grid gap-5 md:grid-cols-2">
        <section className="rounded-card border border-line bg-card p-5" aria-label="Purse">
          <h2 className="font-display text-xl font-bold">{teamName}: purse</h2>
          {purse ? (
            <>
              <dl className="mt-3 grid grid-cols-3 gap-3 text-sm">
                <div><dt className="text-muted">Total</dt><dd className="font-display text-2xl font-bold tabular-nums">{purse.total}</dd></div>
                <div><dt className="text-muted">Spent</dt><dd className="font-display text-2xl font-bold tabular-nums">{purse.spent}</dd></div>
                <div><dt className="text-muted">Remaining</dt><dd className="font-display text-2xl font-bold tabular-nums text-primary">{left}</dd></div>
              </dl>
              {reserveNeeded !== null && <p className="mt-3 text-sm text-muted">Reserve needed to still fill your minimum squad at base prices: <strong className="text-ink">{reserveNeeded}</strong>. Bids that would leave less than this are refused.</p>}
            </>
          ) : <p className="mt-2 text-sm text-muted">Purses are created when the organizer locks the player pool.</p>}
        </section>
        <section className="rounded-card border border-line bg-card p-5" aria-label="Squad requirements">
          <h2 className="font-display text-xl font-bold">Squad requirements</h2>
          <p className="mt-1 text-sm text-muted">Minimum {squadMin ?? "–"}, maximum {squadMax ?? "–"} players.</p>
          <ul className="mt-3 grid grid-cols-2 gap-2 text-sm">
            {categories.map((c) => (
              <li key={c} className="rounded-input border border-line px-3 py-2"><span className="font-semibold">{c}</span><br /><span className="text-muted">{owned[c] ?? 0} owned{limits[c] ? ` · max ${limits[c]}` : " · no limit"}</span></li>
            ))}
          </ul>
        </section>
      </div>

      {done ? (
        <section aria-label="Squad bought" className="rounded-card border border-line bg-card p-5">
          <h2 className="mb-3 font-display text-xl font-bold">Your squad</h2>
          {bought.length === 0 ? <p className="text-sm text-muted">You didn&apos;t buy anyone.</p> : <ul className="divide-y divide-line text-sm">{bought.map((b, i) => <li key={i} className="flex justify-between py-2"><span className="font-semibold">{b.name}<span className="text-muted"> · {b.category ?? "No category"}</span></span><span className="tabular-nums">{b.price} pts</span></li>)}</ul>}
        </section>
      ) : (
        <section aria-label="Player pool" className="rounded-card border border-line bg-card p-5">
          <h2 className="mb-3 font-display text-xl font-bold">Player pool ({pool.length})</h2>
          <div className="mb-3 flex flex-wrap items-end gap-3">
            <label className="text-sm">Search<Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Name" /></label>
            <label className="text-sm">Category<select className="h-11 rounded-input border border-line bg-card px-2" value={cat} onChange={(e) => setCat(e.target.value)}><option value="">All</option>{categories.map((c) => <option key={c}>{c}</option>)}</select></label>
            <label className="flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" checked={only} onChange={(e) => setOnly(e.target.checked)} /> Watchlist only</label>
          </div>
          <p className="mb-2 text-xs text-muted">Watchlist and notes are saved on this device only and are private to you.</p>
          <ul className="divide-y divide-line">
            {shown.map((p) => (
              <li key={p.id} className="py-2">
                <div className="flex items-center gap-2">
                  <button type="button" aria-pressed={watch.has(p.id)} aria-label={`${watch.has(p.id) ? "Remove" : "Add"} ${p.name} ${watch.has(p.id) ? "from" : "to"} watchlist`} onClick={() => toggle(p.id)} className={cn("flex h-11 w-11 items-center justify-center text-xl", watch.has(p.id) ? "text-floodlight" : "text-muted")}>{watch.has(p.id) ? "★" : "☆"}</button>
                  <div className="min-w-0 flex-1"><p className="truncate font-semibold">{p.name}</p><p className="text-xs text-muted">{p.category ?? "No category"} · base {p.base}{p.status !== "upcoming" ? ` · ${p.status}` : ""}</p></div>
                  <Button size="sm" variant="ghost" onClick={() => setOpen(open === p.id ? null : p.id)}>{notes[p.id] ? "Edit note" : "Note"}</Button>
                </div>
                {open === p.id && <div className="ml-12 mt-2"><label className="sr-only" htmlFor={`n-${p.id}`}>Private note about {p.name}</label><Input id={`n-${p.id}`} value={notes[p.id] ?? ""} maxLength={300} placeholder="Private note" onChange={(e) => saveNote(p.id, e.target.value)} /></div>}
              </li>
            ))}
            {shown.length === 0 && <li className="py-6 text-center text-sm text-muted">No players match.</li>}
          </ul>
        </section>
      )}
    </div>
  );
}
