"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/ui/form-field";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { toast } from "@/components/ui/toast";
import { cancelTournament, deleteDraft } from "@/app/(app)/organizer/actions";

export function SettingsTab({ id, name, status, visibility }: { id: string; name: string; status: string; visibility: string }) {
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
