"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { toast } from "@/components/ui/toast";
import { changeStatus } from "@/app/(app)/organizer/actions";

type Action = Parameters<typeof changeStatus>[1];

export interface NextStep {
  title: string;
  text: string;
  action?: { label: string; run: Action; confirm?: string };
  link?: { label: string; href: string };
}

export function nextStepFor(t: { id: string; status: string; squad_mode: string }, poolLocked: boolean, hasFixtures: boolean): NextStep | null {
  const base = `/organizer/tournaments/${t.id}`;
  switch (t.status) {
    case "draft":
      return { title: "Finish setup and pay", text: "Complete the details, then pay the tournament fee to publish.", link: { label: "Continue setup", href: `/organizer/tournaments/new?draft=${t.id}` } };
    case "paid":
      return { title: "Publish your tournament", text: "Payment received. Publishing opens registration to the public.", action: { label: "Publish tournament", run: "publish" } };
    case "registration_open":
      return { title: "Close registration", text: "When you have enough teams and players, close registration to move on.", action: { label: "Close registration", run: "close", confirm: "No new teams or players can join after this. You can reopen it until the auction or fixtures start." } };
    case "registration_closed":
      if (t.squad_mode === "auction") {
        return poolLocked
          ? { title: "Start the auction", text: "The player pool is locked. Open the auction console when you're ready.", link: { label: "Open auction console", href: `${base}/auction/console` } }
          : { title: "Lock the player pool", text: "Set categories and base prices first. Locking creates the auction lots and team purses.", action: { label: "Lock player pool", run: "lockPool", confirm: "After locking, players can't be added or changed in the pool." } };
      }
      return { title: "Lock squads", text: "Check every squad meets the minimum size, then lock them.", action: { label: "Lock squads", run: "lockSquads", confirm: "Managers will no longer be able to edit their squads." } };
    case "auction":
      return { title: "Run the auction", text: "The auction is in progress or ready to finish.", link: { label: "Open auction console", href: `${base}/auction/console` } };
    case "squads_locked":
      return hasFixtures
        ? { title: "Go live", text: "Fixtures are ready. Going live opens results entry.", action: { label: "Go live", run: "goLive" } }
        : { title: "Generate fixtures", text: "Create and publish the match schedule, then go live.", link: { label: "Go to fixtures", href: `${base}?tab=fixtures` } };
    case "live":
      return { title: "Complete the tournament", text: "When the final result is in, mark the tournament complete.", action: { label: "Complete tournament", run: "complete", confirm: "This closes the tournament. Standings and stats stay public." } };
    default:
      return null;
  }
}

export function NextStepCard({ id, step }: { id: string; step: NextStep }) {
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);
  const [confirm, setConfirm] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function run() {
    if (!step.action) return;
    setBusy(true);
    setError(null);
    const r = await changeStatus(id, step.action.run);
    setBusy(false);
    if (!r.ok) return setError(r.error);
    toast({ title: "Done" });
    router.refresh();
  }

  return (
    <section className="rounded-card border border-primary/30 bg-primary/10 p-5" aria-label="Next step">
      <p className="text-xs font-semibold uppercase tracking-wide text-primary">Next step</p>
      <h2 className="mt-1 font-display text-2xl font-bold">{step.title}</h2>
      <p className="mt-1 text-sm text-muted">{step.text}</p>
      <div className="mt-4 flex flex-wrap gap-2">
        {step.action && (
          <Button onClick={() => (step.action!.confirm ? setConfirm(true) : void run())} loading={busy}>
            {step.action.label}
          </Button>
        )}
        {step.link && (
          <Button asChild>
            <Link href={step.link.href}>{step.link.label}</Link>
          </Button>
        )}
      </div>
      {error && (
        <p role="alert" className="mt-3 text-sm text-danger">
          {error}
        </p>
      )}
      {step.action?.confirm && <ConfirmDialog open={confirm} onOpenChange={setConfirm} title={step.action.label} description={step.action.confirm} confirmLabel={step.action.label} onConfirm={run} />}
    </section>
  );
}
