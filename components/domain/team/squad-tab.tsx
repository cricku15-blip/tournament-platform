"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/toast";
import { addPlayer, lockSquad, removePlayer, searchPlayers, setJersey, type Candidate } from "@/app/(app)/manager/actions";

export interface SquadRow {
  id: string;
  name: string;
  username: string | null;
  avatar_url: string | null;
  role: string | null;
  jersey_no: number | null;
  source: string;
  price: number | null;
}

export function SquadTab({
  teamId,
  tournamentName,
  rows,
  min,
  max,
  mode,
  locked,
  canEdit,
  canUnlock,
  teamApproved,
  slug,
}: {
  teamId: string;
  tournamentName: string;
  rows: SquadRow[];
  min: number;
  max: number;
  mode: string;
  locked: boolean;
  canEdit: boolean;
  canUnlock: boolean;
  teamApproved: boolean;
  slug: string;
}) {
  const router = useRouter();
  const [q, setQ] = React.useState("");
  const [results, setResults] = React.useState<Candidate[]>([]);
  const [searching, setSearching] = React.useState(false);
  const [removing, setRemoving] = React.useState<SquadRow | null>(null);
  const [lockOpen, setLockOpen] = React.useState(false);
  const [busy, setBusy] = React.useState<string | null>(null);
  const direct = mode === "direct";
  const count = rows.length;
  const need = Math.max(0, min - count);
  const editable = canEdit && direct && !locked && teamApproved;

  React.useEffect(() => {
    if (q.trim().length < 2) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- clearing results when the query is too short
      setResults([]);
      return;
    }
    const t = setTimeout(async () => {
      setSearching(true);
      const r = await searchPlayers(teamId, q);
      setSearching(false);
      if (r.ok) setResults(r.players);
      else toast({ title: r.error });
    }, 400);
    return () => clearTimeout(t);
  }, [q, teamId]);

  async function run(key: string, fn: () => Promise<{ ok: boolean; error?: string }>, okMsg: string) {
    setBusy(key);
    const r = await fn();
    setBusy(null);
    if (!r.ok) {
      toast({ title: r.error ?? "Something went wrong." });
      return false;
    }
    toast({ title: okMsg });
    router.refresh();
    return true;
  }

  const inviteUrl = typeof window === "undefined" ? "" : `${window.location.origin}/signup?next=${encodeURIComponent(`/tournaments/${slug}`)}`;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-line bg-card p-4">
        <div>
          <p className="font-display text-xl font-bold">{count} of {max} players</p>
          <p className="text-sm text-muted" aria-live="polite">
            {need > 0 ? `Min ${min}, max ${max}. ${need} more needed.` : `Minimum of ${min} reached. Max ${max}.`}
          </p>
        </div>
        {locked ? <Badge variant="completed">Squad locked</Badge> : <Badge variant="neutral">Open</Badge>}
      </div>
      {!direct && <p className="rounded-input border border-line bg-surface p-3 text-sm">Squad is set by the auction.</p>}
      {direct && !teamApproved && <p className="rounded-input border border-line bg-surface p-3 text-sm">You can add players once the organizer approves your team.</p>}

      {editable && (
        <section className="rounded-card border border-line bg-card p-4" aria-label="Add player">
          <h2 className="font-display text-lg font-bold">Add a player</h2>
          <label htmlFor="player-search" className="mt-2 block text-sm font-semibold">Search registered players (same city)</label>
          <Input id="player-search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Name or username" maxLength={40} />
          <div aria-live="polite" className="mt-2">
            {searching && <p className="text-sm text-muted">Searching…</p>}
            {!searching && q.trim().length >= 2 && results.length === 0 && <p className="text-sm text-muted">No available players found in this city.</p>}
            <ul className="divide-y divide-line">
              {results.map((p) => (
                <li key={p.id} className="flex items-center gap-3 py-2">
                  <Avatar src={p.avatar_url} name={p.name} size="sm" />
                  <span className="min-w-0 flex-1"><span className="block truncate font-semibold">{p.name}</span>{p.username && <span className="text-xs text-muted">@{p.username}</span>}</span>
                  <Button size="sm" loading={busy === `add${p.id}`} disabled={count >= max} onClick={async () => { if (await run(`add${p.id}`, () => addPlayer(teamId, p.id), `${p.name} added`)) { setResults((r) => r.filter((x) => x.id !== p.id)); } }}>Add</Button>
                </li>
              ))}
            </ul>
          </div>
          <div className="mt-4 border-t border-line pt-3">
            <p className="text-sm font-semibold">Player not on GroundWar yet?</p>
            <p className="text-sm text-muted">Share a sign-up link. Once they join, search for them above. (Manual in this version.)</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <Button size="sm" variant="secondary" onClick={async () => { await navigator.clipboard.writeText(inviteUrl).catch(() => {}); toast({ title: "Sign-up link copied" }); }}>Copy link</Button>
              <Button asChild size="sm" variant="secondary"><a href={`https://wa.me/?text=${encodeURIComponent(`Join GroundWar and play in ${tournamentName}: ${inviteUrl}`)}`} target="_blank" rel="noopener noreferrer">WhatsApp</a></Button>
            </div>
          </div>
        </section>
      )}

      {rows.length === 0 ? (
        <p className="rounded-card border border-line bg-card p-6 text-center text-sm text-muted">No players in the squad yet.</p>
      ) : (
        <ul className="divide-y divide-line overflow-hidden rounded-card border border-line bg-card">
          {rows.map((r) => (
            <li key={r.id} className="grid grid-cols-[1fr_auto] items-center gap-3 p-3 sm:grid-cols-[1fr_90px_110px_auto]">
              <div className="flex min-w-0 items-center gap-3">
                <Avatar src={r.avatar_url} name={r.name} size="sm" />
                <span className="min-w-0"><span className="block truncate font-semibold">{r.name}</span><span className="text-xs text-muted">{r.role ?? "No role"} · {r.source}{r.price !== null ? ` · ${r.price} pts` : ""}</span></span>
              </div>
              <JerseyInput value={r.jersey_no} disabled={!canEdit || locked} onSave={(n) => run(`j${r.id}`, () => setJersey(teamId, r.id, n), "Jersey saved")} />
              <span className="hidden sm:block"><Badge variant="neutral">Active</Badge></span>
              {editable && r.source !== "auction" ? <Button size="sm" variant="ghost" onClick={() => setRemoving(r)}>Remove</Button> : <span />}
            </li>
          ))}
        </ul>
      )}

      {canEdit && direct && (
        <div className="flex flex-wrap gap-2">
          {!locked ? <Button variant="secondary" onClick={() => setLockOpen(true)} disabled={count < min}>Lock squad</Button> : canUnlock ? <Button variant="secondary" loading={busy === "unlock"} onClick={() => run("unlock", () => lockSquad(teamId, false), "Squad unlocked")}>Unlock squad</Button> : <p className="text-sm text-muted">Only the organizer can unlock a locked squad.</p>}
          {!locked && count < min && <p className="self-center text-sm text-muted">Add {need} more to lock.</p>}
        </div>
      )}

      <ConfirmDialog open={Boolean(removing)} onOpenChange={(o) => !o && setRemoving(null)} title="Remove this player?" itemName={removing?.name} description="They can be added again while the squad is open." confirmLabel="Remove" variant="destructive" onConfirm={async () => { if (removing) await run("rm", () => removePlayer(teamId, removing.id), "Player removed"); }} />
      <ConfirmDialog open={lockOpen} onOpenChange={setLockOpen} title="Lock your squad?" description="You won't be able to add, remove or change players after this. Only the organizer can unlock it." confirmLabel="Lock squad" onConfirm={async () => { await run("lock", () => lockSquad(teamId, true), "Squad locked"); }} />
    </div>
  );
}

function JerseyInput({ value, disabled, onSave }: { value: number | null; disabled: boolean; onSave: (n: number) => Promise<boolean> }) {
  const [v, setV] = React.useState(value === null ? "" : String(value));
  return (
    <div className="flex items-center gap-1">
      <label className="sr-only" htmlFor={`j-${value}-${v}`}>Jersey number</label>
      <Input
        id={`j-${value}-${v}`}
        aria-label="Jersey number"
        inputMode="numeric"
        placeholder="#"
        disabled={disabled}
        value={v}
        onChange={(e) => setV(e.target.value.replace(/\D/g, "").slice(0, 3))}
        onBlur={async () => {
          if (v === "" || Number(v) === value) return;
          const ok = await onSave(Number(v));
          if (!ok) setV(value === null ? "" : String(value));
        }}
        className="w-16 text-center"
      />
    </div>
  );
}
