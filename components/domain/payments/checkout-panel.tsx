"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ReceiptLink } from "./receipt-link";
import { formatINR } from "@/lib/format";
import { pollUntil } from "@/lib/payments/poll";
import { openOrderCheckout } from "@/lib/razorpay/checkout";
import { latestTournamentPaymentId } from "@/lib/payments/actions";
import { changeStatus } from "@/app/(app)/organizer/actions";

interface Quote {
  tierName: string;
  minTeams: number;
  maxTeams: number;
  teams: number;
  amount: number;
  tax: number;
  taxPercent: number;
  total: number;
  upgrade: boolean;
}

type Phase = "idle" | "working" | "modal" | "confirming" | "paid" | "pending" | "failed" | "error";

export function CheckoutPanel({ tournamentId, name, sport, city, targetTeams, prefill }: { tournamentId: string; name: string; sport: string; city: string; targetTeams: number | null; prefill: { name?: string; email?: string } }) {
  const router = useRouter();
  const [quote, setQuote] = React.useState<Quote | null>(null);
  const [quoteError, setQuoteError] = React.useState<string | null>(null);
  const [phase, setPhase] = React.useState<Phase>("idle");
  const [error, setError] = React.useState<string | null>(null);
  const [paymentId, setPaymentId] = React.useState<string | null>(null);
  const [publishing, setPublishing] = React.useState(false);
  const inFlight = React.useRef(false);

  React.useEffect(() => {
    let cancelled = false;
    fetch(`/api/payments/tournament-quote?id=${tournamentId}${targetTeams ? `&target=${targetTeams}` : ""}`, { cache: "no-store" })
      .then(async (r) => {
        const j = await r.json();
        if (!r.ok) throw new Error(j.message ?? "Couldn't load the price.");
        return j as Quote;
      })
      .then((q) => !cancelled && setQuote(q))
      .catch((e: Error) => !cancelled && setQuoteError(e.message));
    return () => {
      cancelled = true;
    };
  }, [tournamentId, targetTeams]);

  async function confirmPayment(): Promise<void> {
    setPhase("confirming");
    const outcome = await pollUntil({
      check: async () => {
        const r = await fetch(`/api/payments/tournament/${tournamentId}/status`, { cache: "no-store" });
        if (!r.ok) return false;
        return Boolean((await r.json()).paid);
      },
    });
    if (outcome === "done") {
      setPaymentId(await latestTournamentPaymentId(tournamentId));
      setPhase("paid");
      router.refresh();
    } else {
      setPhase("pending");
    }
  }

  async function pay() {
    if (inFlight.current) return; // double-click guard; the server also reuses a recent unpaid order
    inFlight.current = true;
    setError(null);
    setPhase("working");
    try {
      const res = await fetch("/api/payments/tournament-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tournamentId, ...(targetTeams ? { targetTeamCount: targetTeams } : {}) }),
      });
      const j = await res.json();
      if (!res.ok) {
        setError(j.message ?? "Something went wrong. You haven't been charged.");
        setPhase("error");
        return;
      }
      setPhase("modal");
      const result = await openOrderCheckout({ orderId: j.orderId, amount: j.amount, keyId: j.keyId, name, prefill });
      if (result === "dismissed") return setPhase("idle");
      if (result === "failed") return setPhase("failed");
      await confirmPayment();
    } catch {
      setError("We couldn't open the payment window. Check your connection and try again. You haven't been charged.");
      setPhase("error");
    } finally {
      inFlight.current = false;
    }
  }

  async function publish() {
    setPublishing(true);
    const r = await changeStatus(tournamentId, "publish");
    setPublishing(false);
    if (!r.ok) return setError(r.error);
    router.push(`/organizer/tournaments/${tournamentId}`);
  }

  if (phase === "paid") {
    return (
      <div role="status" className="mx-auto max-w-lg rounded-card border border-primary/30 bg-primary/10 p-6 text-center">
        <h1 className="font-display text-3xl font-bold">Payment received</h1>
        <p className="mt-2 text-muted">{quote?.upgrade ? "Your plan has been upgraded." : "Your tournament is ready to publish."}</p>
        <div className="mt-5 flex flex-col items-center gap-2">
          {!quote?.upgrade && (
            <Button size="lg" onClick={publish} loading={publishing}>
              Publish tournament
            </Button>
          )}
          {quote?.upgrade && (
            <Button asChild size="lg">
              <Link href={`/organizer/tournaments/${tournamentId}?tab=plan`}>Back to tournament</Link>
            </Button>
          )}
          {paymentId && <ReceiptLink kind="tournament" paymentId={paymentId} label="Download invoice" />}
          {error && <p role="alert" className="text-sm text-danger">{error}</p>}
        </div>
      </div>
    );
  }

  const busy = phase === "working" || phase === "modal" || phase === "confirming";
  return (
    <div className="mx-auto grid max-w-4xl gap-6 md:grid-cols-[1fr_340px]">
      <section className="rounded-card border border-line bg-card p-6" aria-label="Order summary">
        <h1 className="font-display text-3xl font-bold">{quote?.upgrade ? "Upgrade your plan" : "Checkout"}</h1>
        <p className="mt-1 text-muted">{name}</p>
        <dl className="mt-5 divide-y divide-line text-sm">
          <div className="flex justify-between py-3"><dt className="text-muted">Sport</dt><dd className="font-semibold">{sport}</dd></div>
          <div className="flex justify-between py-3"><dt className="text-muted">City</dt><dd className="font-semibold">{city}</dd></div>
          {quote ? (
            <>
              <div className="flex justify-between py-3"><dt className="text-muted">Plan</dt><dd className="font-semibold">{quote.teams} teams (tier {quote.minTeams} to {quote.maxTeams})</dd></div>
              <div className="flex justify-between py-3"><dt className="text-muted">{quote.upgrade ? "Upgrade difference" : "Tournament fee"}</dt><dd className="font-semibold">{formatINR(quote.amount)}</dd></div>
              <div className="flex justify-between py-3"><dt className="text-muted">Tax{quote.taxPercent ? ` (${quote.taxPercent}%)` : ""}</dt><dd className="font-semibold">{formatINR(quote.tax)}</dd></div>
              <div className="flex justify-between py-3 text-base"><dt className="font-bold">Total</dt><dd className="font-display text-2xl font-bold">{formatINR(quote.total)}</dd></div>
            </>
          ) : quoteError ? (
            <div className="py-3 text-danger" role="alert">{quoteError}</div>
          ) : (
            <div className="py-3"><Skeleton className="h-24 w-full" /></div>
          )}
        </dl>
      </section>

      <aside className="flex flex-col gap-4 rounded-card border border-line bg-card p-6">
        <Button size="lg" onClick={pay} loading={busy} disabled={!quote || phase === "confirming"}>
          {quote ? `Pay ${formatINR(quote.total)}` : "Pay"}
        </Button>
        <p className="text-sm text-muted">{quote?.upgrade ? "Your plan upgrades right after payment." : "Your tournament can go live right after payment."}</p>

        <div aria-live="polite" className="text-sm">
          {phase === "confirming" && <p>Confirming payment… Please don&apos;t close this page.</p>}
          {phase === "failed" && <p role="alert" className="text-danger">Payment didn&apos;t go through. You haven&apos;t been charged. Try again.</p>}
          {phase === "pending" && (
            <p role="status">
              We&apos;re confirming your payment. This can take a few minutes. You don&apos;t need to pay again.{" "}
              <button type="button" className="font-semibold text-primary underline" onClick={confirmPayment}>Check again</button>
            </p>
          )}
          {phase === "error" && error && <p role="alert" className="text-danger">{error}</p>}
        </div>

        <div className="flex flex-col gap-1 text-sm">
          <Link href="/refund-policy" className="text-primary hover:underline" target="_blank">Refund policy</Link>
          <Link href={quote?.upgrade ? `/organizer/tournaments/${tournamentId}?tab=plan` : `/organizer/tournaments/new?draft=${tournamentId}`} className="text-primary hover:underline">
            {quote?.upgrade ? "Back to plan" : "Edit tournament"}
          </Link>
        </div>
      </aside>
    </div>
  );
}
