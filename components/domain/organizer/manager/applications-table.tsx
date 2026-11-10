"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ProgressBar } from "@/components/ui/progress-bar";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { toast } from "@/components/ui/toast";
import { reviewApplication } from "@/app/(app)/organizer/actions";
import { formatDate } from "@/lib/format";

export interface ApplicationRow {
  id: string;
  user_id: string;
  status: string;
  role: string | null;
  experience: string | null;
  notes: string | null;
  created_at: string;
  answers: Record<string, unknown>;
  name: string | null;
  username: string | null;
  avatar_url: string | null;
  stats: string[];
}

export function ApplicationsTable({ tournamentId, rows, canReview, questions }: { tournamentId: string; rows: ApplicationRow[]; canReview: boolean; questions: string[] }) {
  const router = useRouter();
  const [selected, setSelected] = React.useState<Set<string>>(new Set());
  const [open, setOpen] = React.useState<ApplicationRow | null>(null);
  const [rejecting, setRejecting] = React.useState<ApplicationRow | null>(null);
  const [reason, setReason] = React.useState("");
  const [progress, setProgress] = React.useState<{ done: number; total: number } | null>(null);
  const [busy, setBusy] = React.useState<string | null>(null);
  const pending = rows.filter((r) => r.status === "pending");

  async function decide(r: ApplicationRow, decision: "approved" | "rejected", why?: string) {
    setBusy(r.id);
    const res = await reviewApplication(tournamentId, r.id, decision, why);
    setBusy(null);
    if (!res.ok) return toast({ title: res.error });
    toast({ title: decision === "approved" ? "Player approved" : "Application rejected" });
    setOpen(null);
    setRejecting(null);
    setReason("");
    router.refresh();
  }

  async function bulkApprove() {
    const ids = pending.filter((r) => selected.has(r.id));
    if (ids.length === 0) return;
    setProgress({ done: 0, total: ids.length });
    let failed = 0;
    let lastError = "";
    for (let i = 0; i < ids.length; i += 10) {
      const chunk = ids.slice(i, i + 10);
      const results = await Promise.all(chunk.map((r) => reviewApplication(tournamentId, r.id, "approved")));
      for (const x of results) if (!x.ok) { failed++; lastError = x.error; }
      setProgress({ done: Math.min(i + 10, ids.length), total: ids.length });
    }
    setProgress(null);
    setSelected(new Set());
    toast({ title: failed ? `${ids.length - failed} approved, ${failed} failed: ${lastError}` : `${ids.length} players approved` });
    router.refresh();
  }

  if (rows.length === 0) return <p className="rounded-card border border-line bg-card p-6 text-center text-sm text-muted">No applications match.</p>;

  return (
    <div className="flex flex-col gap-3">
      {canReview && pending.length > 0 && (
        <div className="flex flex-wrap items-center gap-3 rounded-card border border-line bg-card p-3">
          <label className="flex min-h-11 items-center gap-2 text-sm">
            <input type="checkbox" checked={pending.every((r) => selected.has(r.id))} onChange={(e) => setSelected(e.target.checked ? new Set(pending.map((r) => r.id)) : new Set())} />
            Select all pending
          </label>
          <Button size="sm" disabled={selected.size === 0 || Boolean(progress)} onClick={bulkApprove}>
            Approve selected ({selected.size})
          </Button>
          {progress && (
            <div className="min-w-40 flex-1" role="status">
              <ProgressBar value={(progress.done / progress.total) * 100} label={`${progress.done} of ${progress.total}`} />
            </div>
          )}
        </div>
      )}
      <ul className="divide-y divide-line overflow-hidden rounded-card border border-line bg-card">
        {rows.map((r) => (
          <li key={r.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
            {canReview && r.status === "pending" ? (
              <input type="checkbox" aria-label={`Select ${r.name ?? "applicant"}`} className="h-5 w-5" checked={selected.has(r.id)} onChange={(e) => setSelected((s) => { const n = new Set(s); if (e.target.checked) n.add(r.id); else n.delete(r.id); return n; })} />
            ) : (
              <span className="w-5" />
            )}
            <button type="button" onClick={() => setOpen(r)} className="flex min-h-11 flex-1 items-center gap-3 text-left focus-visible:outline-2 focus-visible:outline-primary">
              <Avatar src={r.avatar_url} name={r.name ?? "Player"} />
              <span className="min-w-0">
                <span className="block truncate font-semibold">{r.name ?? "Player"}</span>
                <span className="block text-sm text-muted">
                  {[r.role, r.experience].filter(Boolean).join(" · ") || "No role given"} · applied {formatDate(r.created_at)}
                </span>
              </span>
            </button>
            <Badge variant={r.status === "approved" ? "open" : r.status === "rejected" ? "cancelled" : "neutral"}>{r.status}</Badge>
            {canReview && r.status === "pending" && (
              <div className="flex gap-2">
                <Button size="sm" loading={busy === r.id} onClick={() => decide(r, "approved")}>
                  Approve
                </Button>
                <Button size="sm" variant="secondary" onClick={() => setRejecting(r)}>
                  Reject
                </Button>
              </div>
            )}
          </li>
        ))}
      </ul>

      <Sheet open={Boolean(open)} onOpenChange={(o) => !o && setOpen(null)}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>{open?.name ?? "Applicant"}</SheetTitle>
          </SheetHeader>
          {open && (
            <div className="mt-4 flex flex-col gap-4 text-sm">
              <div className="flex items-center gap-3">
                <Avatar src={open.avatar_url} name={open.name ?? "Player"} size="lg" />
                <div>
                  <p className="font-semibold">{open.name}</p>
                  {open.username && (
                    <Link href={`/players/${open.username}`} className="text-primary hover:underline" target="_blank">
                      View public profile
                    </Link>
                  )}
                </div>
              </div>
              <dl className="grid grid-cols-2 gap-3">
                <div><dt className="text-muted">Role</dt><dd className="font-semibold">{open.role ?? "–"}</dd></div>
                <div><dt className="text-muted">Experience</dt><dd className="font-semibold">{open.experience ?? "–"}</dd></div>
              </dl>
              {open.stats.length > 0 && (
                <div>
                  <p className="text-muted">Past stats</p>
                  <ul className="list-disc pl-5">{open.stats.map((s) => <li key={s}>{s}</li>)}</ul>
                </div>
              )}
              {open.notes && <div><p className="text-muted">Note</p><p>{open.notes}</p></div>}
              {Object.keys(open.answers ?? {}).length > 0 && (
                <div>
                  <p className="text-muted">Answers</p>
                  <ul className="flex flex-col gap-1">
                    {Object.entries(open.answers).map(([k, v], i) => (
                      <li key={k}><span className="text-muted">{questions[i] ?? k}: </span>{String(v)}</li>
                    ))}
                  </ul>
                </div>
              )}
              {canReview && open.status === "pending" && (
                <div className="flex gap-2">
                  <Button loading={busy === open.id} onClick={() => decide(open, "approved")}>Approve</Button>
                  <Button variant="secondary" onClick={() => { setRejecting(open); setOpen(null); }}>Reject</Button>
                </div>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>

      <Sheet open={Boolean(rejecting)} onOpenChange={(o) => !o && setRejecting(null)}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Reject {rejecting?.name ?? "application"}</SheetTitle>
          </SheetHeader>
          <div className="mt-4 flex flex-col gap-3">
            <label htmlFor="reject-reason" className="text-sm font-semibold">Reason (optional, shown to the player)</label>
            <Input id="reject-reason" value={reason} maxLength={200} onChange={(e) => setReason(e.target.value)} />
            <Button variant="destructive" loading={busy === rejecting?.id} onClick={() => rejecting && decide(rejecting, "rejected", reason || undefined)}>
              Reject application
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
