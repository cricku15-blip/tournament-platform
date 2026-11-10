"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { toast } from "@/components/ui/toast";
import { formatDate, formatINR } from "@/lib/format";
import { pollUntil } from "@/lib/payments/poll";
import { openSubscriptionCheckout } from "@/lib/razorpay/checkout";
import type { SubscriptionView } from "@/lib/payments/eligibility";

export interface PlanInfo {
  name: string;
  amount_paise: number;
  description: string | null;
  benefits: string[];
}

export function SubscriptionPanel({ view, plan, periodEnd, graceUntil, prefill }: { view: SubscriptionView; plan: PlanInfo | null; periodEnd: string | null; graceUntil: string | null; prefill: { name?: string; email?: string } }) {
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);
  const [confirming, setConfirming] = React.useState(false);
  const [cancelOpen, setCancelOpen] = React.useState(false);
  const [message, setMessage] = React.useState<{ tone: "error" | "info"; text: string } | null>(null);
  const inFlight = React.useRef(false);

  async function waitForActive() {
    setConfirming(true);
    const outcome = await pollUntil({
      check: async () => {
        const r = await fetch("/api/payments/subscription/status", { cache: "no-store" });
        return r.ok && Boolean((await r.json()).active);
      },
    });
    setConfirming(false);
    if (outcome === "done") {
      toast({ title: "Subscription active" });
      router.refresh();
    } else {
      setMessage({ tone: "info", text: "We're confirming your payment. This can take a few minutes. You don't need to pay again." });
    }
  }

  async function start() {
    if (inFlight.current) return;
    inFlight.current = true;
    setMessage(null);
    setBusy(true);
    try {
      const res = await fetch("/api/payments/subscription", { method: "POST" });
      const j = await res.json();
      if (!res.ok) return setMessage({ tone: "error", text: j.message ?? "Something went wrong. You haven't been charged." });
      const result = await openSubscriptionCheckout({ subscriptionId: j.subscriptionId, keyId: j.keyId, prefill });
      if (result === "dismissed") return;
      if (result === "failed") return setMessage({ tone: "error", text: "Payment didn't go through. You haven't been charged. Try again." });
      await waitForActive();
    } catch {
      setMessage({ tone: "error", text: "We couldn't open the payment window. Check your connection and try again." });
    } finally {
      setBusy(false);
      inFlight.current = false;
    }
  }

  async function cancel() {
    const res = await fetch("/api/payments/subscription/cancel", { method: "POST" });
    const j = await res.json();
    if (!res.ok) {
      setMessage({ tone: "error", text: j.message ?? "Couldn't cancel. Try again." });
      return;
    }
    toast({ title: "Subscription will end at the end of the period" });
    router.refresh();
  }

  const price = plan ? `${formatINR(plan.amount_paise)} / month` : null;
  const startLabel = view === "cancelling" ? "Resume subscription" : view === "past_due" ? "Fix payment" : "Start subscription";

  return (
    <section className="rounded-card border border-line bg-card p-6" aria-label="Subscription status">
      {view === "past_due" && (
        <div role="alert" className="mb-4 rounded-input border border-danger/40 bg-danger/10 p-3 text-sm text-danger">
          Your last payment failed. Update your payment{graceUntil ? ` before ${formatDate(graceUntil)}` : ""} to keep applying to tournaments.
        </div>
      )}
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="font-display text-2xl font-bold">{plan?.name ?? "Player subscription"}</h2>
        {view === "active" && <Badge variant="open">Active</Badge>}
        {view === "cancelling" && <Badge variant="draft">Ends {periodEnd ? formatDate(periodEnd) : "soon"}</Badge>}
        {view === "past_due" && <Badge variant="cancelled">Payment failed</Badge>}
        {view === "expired" && <Badge variant="neutral">Expired</Badge>}
        {view === "none" && <Badge variant="neutral">Not subscribed</Badge>}
      </div>
      {price && <p className="mt-1 text-muted">{price}</p>}
      {view === "active" && periodEnd && <p className="mt-2 text-sm">Renews on <strong>{formatDate(periodEnd)}</strong>.</p>}
      {view === "cancelling" && periodEnd && <p className="mt-2 text-sm">Cancelled. You can still apply until <strong>{formatDate(periodEnd)}</strong>. Resume to keep going without a gap.</p>}
      {view === "expired" && <p className="mt-2 text-sm">Your subscription has ended. Your registrations and squads are untouched, but you can&apos;t apply to new tournaments until you subscribe again.</p>}

      <div className="mt-5 flex flex-wrap gap-2">
        {view !== "active" && (
          <Button size="lg" onClick={start} loading={busy || confirming} disabled={!plan}>
            {startLabel}
          </Button>
        )}
        {view === "active" && (
          <Button variant="secondary" onClick={() => setCancelOpen(true)}>
            Cancel subscription
          </Button>
        )}
      </div>
      <div aria-live="polite" className="mt-3 text-sm">
        {confirming && <p>Confirming payment… Please don&apos;t close this page.</p>}
        {message && <p role={message.tone === "error" ? "alert" : "status"} className={message.tone === "error" ? "text-danger" : "text-muted"}>{message.text}</p>}
      </div>
      <ConfirmDialog
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        title="Cancel your subscription?"
        description={`You can keep applying until ${periodEnd ? formatDate(periodEnd) : "the end of this period"}. Existing registrations stay valid.`}
        confirmLabel="Cancel subscription"
        variant="destructive"
        onConfirm={cancel}
      />
    </section>
  );
}
