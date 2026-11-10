"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/ui/form-field";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { toast } from "@/components/ui/toast";
import { cancelTournament, deleteDraft } from "@/app/(app)/organizer/actions";
import { addAssistant, removeAssistant, transferTournament } from "@/app/(app)/organizer/tournaments/[id]/access-actions";

export interface Assistant { id: string; name: string; username: string | null }

function AccessSection({ id, isOwner, assistants, finished }: { id: string; isOwner: boolean; assistants: Assistant[]; finished: boolean }) {
  const router = useRouter();
  const [uname, setUname] = React.useState("");
  const [newOwner, setNewOwner] = React.useState("");
  const [confirm, setConfirm] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState<string | undefined>();

  async function act(fn: () => Promise<{ ok: true } | { ok: false; error: string }>, okMsg: string) {
    setBusy(true);
    setErr(undefined);
    const r = await fn();
    setBusy(false);
    if (!r.ok) { setErr(r.error); return false; }
    toast({ title: okMsg });
    router.refresh();
    return true;
  }

  return (
    <section className="rounded-card border border-line bg-card p-5">
      <h2 className="font-display text-xl font-bold">Assistant organizers</h2>
      <p className="mt-1 text-sm text-muted">Assistants can run the tournament day to day: teams, fixtures, results, auction and chat. They can&apos;t transfer, cancel ownership or add other assistants.</p>
      <ul className="mt-3 flex flex-col gap-2">
        {assistants.length === 0 && <li className="text-sm text-muted">No assistants yet.</li>}
        {assistants.map((a) => (
          <li key={a.id} className="flex items-center justify-between gap-3 rounded-input bg-surface px-3 py-2 text-sm">
            <span><strong>{a.name}</strong> {a.username && <span className="text-muted">@{a.username}</span>}</span>
            {isOwner && <Button variant="ghost" disabled={busy} onClick={() => act(() => removeAssistant(id, a.id), "Assistant removed")}>Remove</Button>}
          </li>
        ))}
      </ul>
      {isOwner && !finished && (
        <div className="mt-4 grid max-w-xl gap-4">
          <form className="flex items-end gap-2" onSubmit={async (e) => { e.preventDefault(); if (await act(() => addAssistant(id, uname), "Assistant added")) setUname(""); }}>
            <div className="flex-1"><FormField id="asst-user" label="Add by username" error={err}><Input id="asst-user" value={uname} onChange={(e) => setUname(e.target.value)} placeholder="username" /></FormField></div>
            <Button type="submit" disabled={busy || uname.trim().length < 3}>Add</Button>
          </form>
          <div className="rounded-input border border-danger/40 p-3">
            <h3 className="font-semibold text-danger">Transfer ownership</h3>
            <p className="mt-1 text-sm text-muted">The new owner takes over fully. You stay on as an assistant.</p>
            <div className="mt-2 flex items-end gap-2">
              <div className="flex-1"><FormField id="xfer-user" label="New owner's username"><Input id="xfer-user" value={newOwner} onChange={(e) => setNewOwner(e.target.value)} /></FormField></div>
              <Button variant="destructive" disabled={busy || newOwner.trim().length < 3} onClick={() => setConfirm(true)}>Transfer</Button>
            </div>
            <ConfirmDialog open={confirm} onOpenChange={setConfirm} title="Transfer this tournament?" itemName={`@${newOwner.trim()}`} description="You will lose owner rights. This is recorded in the audit log." confirmLabel="Transfer" variant="destructive" onConfirm={async () => { await act(() => transferTournament(id, newOwner), "Ownership transferred"); }} />
          </div>
        </div>
      )}
    </section>
  );
}

export function SettingsTab({ id, name, status, visibility, isOwner, assistants }: { id: string; name: string; status: string; visibility: string; isOwner: boolean; assistants: Assistant[] }) {
  const router = useRouter();
  const [reason, setReason] = React.useState("");
  const [typed, setTyped] = React.useState("");
  const [open, setOpen] = React.useState(false);
  const [delOpen, setDelOpen] = React.useState(false);
  const [error, setError] = React.useState<string | undefined>();
  const finished = status === "cancelled" || status === "completed";

  async function cancel() {
    const r = await cancelTournament(id, reason);
    if (!r.ok) {
      setError(r.error);
      return;
    }
    toast({ title: "Tournament cancelled" });
    router.refresh();
  }
  async function del() {
    const r = await deleteDraft(id);
    if (!r.ok) {
      toast({ title: r.error });
      return;
    }
    toast({ title: "Draft deleted" });
    router.push("/organizer/tournaments");
  }

  return (
    <div className="flex flex-col gap-6">
      <section className="rounded-card border border-line bg-card p-5">
        <h2 className="font-display text-xl font-bold">Visibility</h2>
        <p className="mt-1 text-sm text-muted">Currently <strong className="text-ink">{visibility}</strong>. Change it in the Setup tab.</p>
      </section>
      <AccessSection id={id} isOwner={isOwner} assistants={assistants} finished={finished} />
      {!finished && status !== "draft" && (
        <section className="rounded-card border border-danger/40 bg-card p-5">
          <h2 className="font-display text-xl font-bold text-danger">Cancel tournament</h2>
          <p className="mt-1 text-sm text-muted">Everyone involved is notified. This can&apos;t be undone.</p>
          <div className="mt-3 max-w-md">
            <FormField id="cancel-reason" label="Reason (required)" error={error}>
              <Input id="cancel-reason" value={reason} maxLength={300} onChange={(e) => setReason(e.target.value)} />
            </FormField>
          </div>
          <Button variant="destructive" className="mt-3" disabled={reason.trim().length < 3} onClick={() => setOpen(true)}>Cancel tournament</Button>
          <ConfirmDialog open={open} onOpenChange={setOpen} title="Cancel this tournament?" itemName={name} description="Teams and players will be told it was cancelled." confirmLabel="Cancel tournament" variant="destructive" onConfirm={cancel} />
        </section>
      )}
      {status === "draft" && (
        <section className="rounded-card border border-danger/40 bg-card p-5">
          <h2 className="font-display text-xl font-bold text-danger">Delete draft</h2>
          <p className="mt-1 text-sm text-muted">Type the tournament name to confirm.</p>
          <div className="mt-3 max-w-md"><FormField id="del-name" label={`Type ${name}`}><Input id="del-name" value={typed} onChange={(e) => setTyped(e.target.value)} /></FormField></div>
          <Button variant="destructive" className="mt-3" disabled={typed.trim() !== name} onClick={() => setDelOpen(true)}>Delete draft</Button>
          <ConfirmDialog open={delOpen} onOpenChange={setDelOpen} title="Delete this draft?" itemName={name} description="This can't be undone." confirmLabel="Delete draft" variant="destructive" onConfirm={del} />
        </section>
      )}
      {finished && <p className="text-sm text-muted">This tournament is {status}. No further settings can change.</p>}
    </div>
  );
}
