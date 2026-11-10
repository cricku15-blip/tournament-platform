"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/toast";
import { changeStatus } from "@/app/(app)/organizer/actions";
import { recordSimpleSale, scheduleAuction, startAuction } from "@/app/(app)/organizer/tournaments/[id]/auction/actions";
import { isoToLocal } from "@/lib/organizer/datetime";
import { cn } from "@/lib/utils";

export interface Check { label: string; ok: boolean; hint?: string }
export interface SoldRow { player: string; category: string | null; team: string | null; price: number | null; status: string }
export interface SimpleLot { id: string; name: string; base: number; category: string | null }

export function AuctionTab({
  tournamentId, mode, status, poolLocked, scheduledAt, checks, canLock, sold, lots, teams,
}: {
  tournamentId: string; mode: "live" | "simple"; status: string; poolLocked: boolean; scheduledAt: string; checks: Check[];
  canLock: boolean; sold: SoldRow[]; lots: SimpleLot[]; teams: Array<{ id: string; name: string }>;
}) {
  const router = useRouter();
  const [when, setWhen] = React.useState(isoToLocal(scheduledAt));
  const [busy, setBusy] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [startOpen, setStartOpen] = React.useState(false);
  const [player, setPlayer] = React.useState("");
  const [team, setTeam] = React.useState("");
  const [price, setPrice] = React.useState("");
  const ready = checks.every((c) => c.ok);
  const live = status === "live" || status === "paused";
  const done = status === "completed";

  async function run(key: string, fn: () => Promise<{ ok: boolean; error?: string }>, okMsg: string) {
    setBusy(key);
    setError(null);
    const r = await fn();
    setBusy(null);
    if (!r.ok) {
      setError(r.error ?? "Something went wrong.");
      return false;
    }
    toast({ title: okMsg });
    router.refresh();
    return true;
  }

  return (
    <div className="flex flex-col gap-5">
      <section className="rounded-card border border-line bg-card p-5" aria-label="Readiness">
        <h2 className="mb-3 font-display text-xl font-bold">Readiness checklist</h2>
        <ul className="flex flex-col gap-2">
          {checks.map((c) => (
            <li key={c.label} className="flex items-start gap-3 text-sm">
              <span aria-hidden className={cn("mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-xs", c.ok ? "border-primary bg-primary text-primary-ink" : "border-line")}>{c.ok ? "✓" : ""}</span>
              <span><span className={c.ok ? "text-muted" : "font-semibold"}>{c.label}</span><span className="sr-only">{c.ok ? " (done)" : " (to do)"}</span>{!c.ok && c.hint && <span className="block text-muted">{c.hint}</span>}</span>
            </li>
          ))}
        </ul>
        <div className="mt-4 flex flex-wrap gap-2">
          {!poolLocked && canLock && <Button variant="secondary" loading={busy === "lock"} onClick={() => run("lock", () => changeStatus(tournamentId, "lockPool"), "Player pool locked")}>Lock player pool</Button>}
          {!live && !done && <Button disabled={!ready} onClick={() => setStartOpen(true)} title={ready ? undefined : "Finish the checklist first"}>Start auction</Button>}
          {(live || done) && mode === "live" && <Button asChild><Link href={`/organizer/tournaments/${tournamentId}/auction/console`}>Open console</Link></Button>}
        </div>
        {error && <p role="alert" className="mt-3 text-sm text-danger">{error}</p>}
      </section>

      {!live && !done && poolLocked && (
        <section className="rounded-card border border-line bg-card p-5" aria-label="Schedule">
          <h2 className="mb-2 font-display text-xl font-bold">Schedule</h2>
          <div className="flex flex-wrap items-end gap-2">
            <label className="text-sm">Auction date and time<Input type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} /></label>
            <Button variant="secondary" disabled={!when} loading={busy === "sched"} onClick={() => run("sched", () => scheduleAuction(tournamentId, when), "Auction scheduled and members notified")}>Schedule</Button>
          </div>
        </section>
      )}

      {mode === "simple" && live && (
        <section className="rounded-card border border-line bg-card p-5" aria-label="Record a sale">
          <h2 className="mb-1 font-display text-xl font-bold">Record a sale</h2>
          <p className="mb-3 text-sm text-muted">Pick the player, the team and the price. The same purse, squad and category rules as the live auction apply.</p>
          <div className="grid gap-3 sm:grid-cols-4">
            <label className="text-sm">Player<select className="h-11 w-full rounded-input border border-line bg-card px-2" value={player} onChange={(e) => { setPlayer(e.target.value); const l = lots.find((x) => x.id === e.target.value); if (l) setPrice(String(Math.max(l.base, 1))); }}><option value="">Choose</option>{lots.map((l) => <option key={l.id} value={l.id}>{l.name} (base {l.base})</option>)}</select></label>
            <label className="text-sm">Team<select className="h-11 w-full rounded-input border border-line bg-card px-2" value={team} onChange={(e) => setTeam(e.target.value)}><option value="">Choose</option>{teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</select></label>
            <label className="text-sm">Price (points)<Input inputMode="numeric" value={price} onChange={(e) => setPrice(e.target.value.replace(/\D/g, ""))} /></label>
            <div className="flex items-end"><Button disabled={!player || !team || !price} loading={busy === "sale"} onClick={async () => { if (await run("sale", () => recordSimpleSale(tournamentId, player, team, Number(price)), "Sale recorded")) { setPlayer(""); setPrice(""); } }}>Record sale</Button></div>
          </div>
          <div className="mt-3"><Button variant="secondary" loading={busy === "end"} onClick={() => run("end", async () => { const { rpc } = await import("@/lib/rpc"); const r = await rpc("end_auction", { p_tid: tournamentId }); return r.error ? { ok: false, error: r.error.message } : { ok: true }; }, "Auction ended")}>End auction</Button></div>
        </section>
      )}

      {(live || done || sold.length > 0) && (
        <section className="rounded-card border border-line bg-card p-5" aria-label="Results">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="font-display text-xl font-bold">Results</h2>
            <Button asChild size="sm" variant="secondary"><a href={`/organizer/tournaments/${tournamentId}/auction/export`}>Download CSV</a></Button>
          </div>
          {sold.length === 0 ? <p className="text-sm text-muted">Nothing sold yet.</p> : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <caption className="sr-only">Auction results</caption>
                <thead className="text-left text-xs uppercase text-muted"><tr><th scope="col" className="pb-2">Player</th><th scope="col" className="pb-2">Category</th><th scope="col" className="pb-2">Team</th><th scope="col" className="pb-2 text-right">Price</th></tr></thead>
                <tbody className="divide-y divide-line">{sold.map((r, i) => <tr key={i}><td className="py-2">{r.player}</td><td className="py-2">{r.category ?? "–"}</td><td className="py-2">{r.status === "sold" ? r.team : <span className="text-muted">Unsold</span>}</td><td className="py-2 text-right tabular-nums">{r.price ?? "–"}</td></tr>)}</tbody>
              </table>
            </div>
          )}
        </section>
      )}
      <ConfirmDialog open={startOpen} onOpenChange={setStartOpen} title="Start the auction?" description="Everyone is notified that the auction is live. Make sure all managers are ready." confirmLabel="Start auction" onConfirm={async () => { await run("start", () => startAuction(tournamentId), "Auction started"); }} />
    </div>
  );
}
