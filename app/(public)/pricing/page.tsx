import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { formatINR } from "@/lib/format";
import { getPricing } from "@/lib/public/queries";

export const metadata: Metadata = { title: "Pricing", description: "Simple pricing for organizers and players.", alternates: { canonical: "/pricing" } };
export const revalidate = 300;

export default async function PricingPage() {
  const pricing = await getPricing().catch(() => null);
  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <h1 className="font-display text-4xl font-bold text-ink">Pricing</h1>
      {!pricing ? (
        <div className="mt-8">
          <EmptyState title="Pricing is unavailable right now" description="Please check back in a few minutes." />
        </div>
      ) : (
        <>
          <section className="mt-8" aria-label="Organizer pricing">
            <h2 className="font-display text-2xl font-bold">For organizers</h2>
            <p className="text-sm text-muted">One-time fee per tournament, based on its size.</p>
            <ul className="mt-4 grid gap-4 md:grid-cols-3">
              {pricing.tiers.map((t) => (
                <li key={t.id} className="rounded-card border border-line bg-card p-5">
                  <h3 className="font-display text-xl font-bold">{t.name}</h3>
                  <p className="mt-2 font-display text-3xl font-bold text-primary">{formatINR(t.amount_paise)}</p>
                  <p className="text-sm text-muted">{t.min_teams} to {t.max_teams} teams</p>
                </li>
              ))}
            </ul>
          </section>
          <section className="mt-10" aria-label="Player pricing">
            <h2 className="font-display text-2xl font-bold">For players</h2>
            <ul className="mt-4 grid gap-4 md:grid-cols-2">
              {pricing.plans.map((p) => (
                <li key={p.id} className="rounded-card border border-line bg-card p-5">
                  <h3 className="font-display text-xl font-bold">{p.name}</h3>
                  <p className="mt-2 font-display text-3xl font-bold text-primary">{formatINR(p.amount_paise)}<span className="text-base font-normal text-muted"> / 30 days</span></p>
                  {p.description && <p className="mt-2 text-sm text-ink/90">{p.description}</p>}
                  {Array.isArray(p.benefits) && (
                    <ul className="mt-3 list-disc pl-5 text-sm text-ink/90">
                      {(p.benefits as unknown[]).map((b, i) => (
                        <li key={i}>{String(b)}</li>
                      ))}
                    </ul>
                  )}
                </li>
              ))}
            </ul>
          </section>
          <p className="mt-6 text-xs text-muted">Prices are shown before any applicable taxes. Payments are processed securely by Razorpay.</p>
          <Button asChild className="mt-6"><Link href="/signup">Get started</Link></Button>
        </>
      )}
    </div>
  );
}
