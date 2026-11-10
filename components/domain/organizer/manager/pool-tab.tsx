"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { toast } from "@/components/ui/toast";
import { changeStatus, setSequenceMode, updatePoolPlayers } from "@/app/(app)/organizer/actions";

export interface PoolRow {
  id: string;
  name: string | null;
  category: string | null;
  base_price: number;
  sequence_no: number | null;
}

export function PoolTab({ tournamentId, rows, categories, sequenceMode, locked, canLock }: { tournamentId: string; rows: PoolRow[]; categories: string[]; sequenceMode: string; locked: boolean; canLock: boolean }) {
  const router = useRouter();
  const [items, setItems] = React.useState(rows);
  const [dirty, setDirty] = React.useState<Set<string>>(new Set());
  const [bulkCat, setBulkCat] = React.useState("");
  const [bulkPrice, setBulkPrice] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [lockOpen, setLockOpen] = React.useState(false);
  const [dragId, setDragId] = React.useState<string | null>(null);

  const edit = (id: string, p: Partial<PoolRow>) => {
    setItems((prev) => prev.map((r) => (r.id === id ? { ...r, ...p } : r)));
    setDirty((d) => new Set(d).add(id));
  };

  function applyBulk() {
    const price = bulkPrice === "" ? null : Number(bulkPrice);
    setItems((prev) => prev.map((r) => ({ ...r, ...(bulkCat ? { category: bulkCat } : {}), ...(price !== null && !Number.isNaN(price) ? { base_price: price } : {}) })));
    setDirty(new Set(items.map((r) => r.id)));
  }

  function drop(targetId: string) {
    if (!dragId || dragId === targetId) return;
    const from = items.findIndex((r) => r.id === dragId);
    const to = items.findIndex((r) => r.id === targetId);
    const next = [...items];
    const [m] = next.splice(from, 1);
    next.splice(to, 0, m);
    setItems(next.map((r, i) => ({ ...r, sequence_no: i + 1 })));
    setDirty(new Set(next.map((r) => r.id)));
    setDragId(null);
  }

  async function save() {
    setBusy(true);
    const updates = items.filter((r) => dirty.has(r.id)).map((r) => ({ id: r.id, category: r.category, base_price: r.base_price, ...(sequenceMode === "manual" ? { sequence_no: r.sequence_no } : {}) }));
    const res = await updatePoolPlayers(tournamentId, updates);
    setBusy(false);
    if (!res.ok) return toast({ title: res.error });
    setDirty(new Set());
    toast({ title: "Pool saved" });
    router.refresh();
  }

  async function lock() {
    const r = await changeStatus(tournamentId, "lockPool");
    if (!r.ok) {
      toast({ title: r.error });
      return;
    }
    toast({ title: "Player pool locked" });
    router.refresh();
  }

  async function seq(mode: "random" | "category" | "manual") {
    const r = await setSequenceMode(tournamentId, mode);
    if (!r.ok) return toast({ title: r.error });
    router.refresh();
  }

  if (items.length === 0) return <p className="rounded-card border border-line bg-card p-6 text-center text-sm text-muted">No approved players yet. Approve applications to fill the pool.</p>;

  return (
    <div className="flex flex-col gap-4">
      {locked && <p className="rounded-input border border-line bg-surface p-3 text-sm">The pool is locked. Auction lots and team purses have been created.</p>}
      {!locked && (
        <div className="flex flex-wrap items-end gap-3 rounded-card border border-line bg-card p-4">
          <div>
            <label htmlFor="seq" className="mb-1 block text-sm font-semibold">Player order</label>
            <select id="seq" value={sequenceMode} onChange={(e) => seq(e.target.value as "random" | "category" | "manual")} className="h-11 rounded-input border border-line bg-card px-3">
              <option value="random">Random</option>
              <option value="category">By category</option>
              <option value="manual">Manual (drag rows)</option>
            </select>
          </div>
          <div>
            <label htmlFor="bulk-cat" className="mb-1 block text-sm font-semibold">Bulk category</label>
            <select id="bulk-cat" value={bulkCat} onChange={(e) => setBulkCat(e.target.value)} className="h-11 rounded-input border border-line bg-card px-3">
              <option value="">No change</option>
              {categories.map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div className="w-32">
            <label htmlFor="bulk-price" className="mb-1 block text-sm font-semibold">Bulk base price</label>
            <Input id="bulk-price" inputMode="numeric" value={bulkPrice} onChange={(e) => setBulkPrice(e.target.value)} />
          </div>
          <Button variant="secondary" onClick={applyBulk}>Apply to all</Button>
        </div>
      )}
      <ul className="divide-y divide-line overflow-hidden rounded-card border border-line bg-card">
        {items.map((r, i) => (
          <li
            key={r.id}
            draggable={!locked && sequenceMode === "manual"}
            onDragStart={() => setDragId(r.id)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => drop(r.id)}
            className="grid grid-cols-[32px_1fr] items-center gap-3 p-3 sm:grid-cols-[32px_1fr_160px_110px]"
          >
            <span className="font-display font-bold text-muted">{sequenceMode === "manual" ? r.sequence_no ?? i + 1 : i + 1}</span>
            <span className="truncate font-semibold">{r.name ?? "Player"}</span>
            <select aria-label={`Category for ${r.name}`} disabled={locked} value={r.category ?? ""} onChange={(e) => edit(r.id, { category: e.target.value || null })} className="h-11 rounded-input border border-line bg-card px-2 disabled:opacity-60">
              <option value="">No category</option>
              {categories.map((c) => <option key={c}>{c}</option>)}
            </select>
            <Input aria-label={`Base price for ${r.name}`} disabled={locked} inputMode="numeric" value={r.base_price} onChange={(e) => edit(r.id, { base_price: Math.max(0, Number(e.target.value) || 0) })} />
          </li>
        ))}
      </ul>
      {!locked && (
        <div className="flex flex-wrap gap-2">
          <Button onClick={save} disabled={dirty.size === 0} loading={busy}>Save changes</Button>
          {canLock && <Button variant="secondary" onClick={() => setLockOpen(true)} disabled={dirty.size > 0}>Lock pool</Button>}
        </div>
      )}
      <ConfirmDialog open={lockOpen} onOpenChange={setLockOpen} title="Lock the player pool?" description="No players can be added or changed after this. Auction lots and team purses are created." confirmLabel="Lock pool" onConfirm={lock} />
    </div>
  );
}
