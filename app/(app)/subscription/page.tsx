import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { getProfile, getSessionUser } from "@/lib/session";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { ReceiptLink } from "@/components/domain/payments/receipt-link";
import { SubscriptionPanel, type PlanInfo } from "@/components/domain/payments/subscription-panel";
import { subscriptionView } from "@/lib/payments/eligibility";
import { formatDate, formatINR } from "@/lib/format";

export const metadata: Metadata = { title: "Subscription" };

const COVERS = ["Apply to any tournament or auction in your city", "A public player profile with your career stats", "Cancel any time. You keep access until the period ends"];
const FAQ = [
  ["What does the subscription cover?", "It lets you apply to tournaments and auctions in your city and keeps your public profile and stats."],
  ["What happens if I cancel?", "You keep access until the end of the paid period. Your registrations, pool entries and squads stay exactly as they are."],
  ["What if a payment fails?", "You get a short grace period to fix it. During that time you can still apply. After it, new applications are paused until you pay."],
  ["Is entry money part of this?", "No. Tournament entry fees and prizes are handled by the organizer outside GroundWar."],
];

export default async function SubscriptionPage() {
  const user = await getSessionUser();
  const profile = await getProfile();
  if (!user) return null;
  const supabase = await createClient();
  const [sub, plan, payments] = await Promise.all([
    supabase.from("subscriptions").select("id, status, cancel_at_period_end, current_period_end, grace_until").eq("user_id", user.id).order("created_at", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("player_plans").select("name, amount_paise, description, benefits").eq("is_active", true).order("version", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("subscription_payments").select("id, amount_paise, status, paid_at, created_at, receipt_url").eq("user_id", user.id).order("created_at", { ascending: false }).limit(24),
  ]);

  const view = subscriptionView(sub.data);
  const planInfo: PlanInfo | null = plan.data ? { name: plan.data.name, amount_paise: plan.data.amount_paise, description: plan.data.description, benefits: Array.isArray(plan.data.benefits) ? (plan.data.benefits as string[]) : [] } : null;
  const rows = payments.data ?? [];

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <h1 className="font-display text-3xl font-bold">Subscription</h1>
      <SubscriptionPanel view={view} plan={planInfo} periodEnd={sub.data?.current_period_end ?? null} graceUntil={sub.data?.grace_until ?? null} prefill={{ name: profile?.full_name ?? undefined, email: user.email ?? undefined }} />

      <section className="rounded-card border border-line bg-card p-6" aria-label="What it covers">
        <h2 className="mb-3 font-display text-xl font-bold">What it covers</h2>
        <ul className="list-disc pl-5 text-sm">{(planInfo?.benefits.length ? planInfo.benefits : COVERS).map((b) => <li key={b} className="py-0.5">{b}</li>)}</ul>
        {planInfo?.description && <p className="mt-3 text-sm text-muted">{planInfo.description}</p>}
      </section>

      <section className="rounded-card border border-line bg-card p-6" aria-label="Billing history">
        <h2 className="mb-3 font-display text-xl font-bold">Billing history</h2>
        {rows.length === 0 ? (
          <p className="text-sm text-muted">No payments yet.</p>
        ) : (
          <>
            <table className="hidden w-full text-sm md:table">
              <caption className="sr-only">Billing history</caption>
              <thead className="text-left text-xs uppercase text-muted"><tr><th scope="col" className="pb-2">Date</th><th scope="col" className="pb-2">Description</th><th scope="col" className="pb-2 text-right">Amount</th><th scope="col" className="pb-2">Status</th><th scope="col" className="pb-2"><span className="sr-only">Receipt</span></th></tr></thead>
              <tbody className="divide-y divide-line">
                {rows.map((p) => (
                  <tr key={p.id}>
                    <td className="py-2">{formatDate(p.paid_at ?? p.created_at)}</td>
                    <td className="py-2">Player monthly</td>
                    <td className="py-2 text-right tabular-nums">{formatINR(p.amount_paise)}</td>
                    <td className="py-2"><Badge variant={p.status === "paid" ? "open" : p.status === "failed" ? "cancelled" : "neutral"}>{p.status}</Badge></td>
                    <td className="py-2 text-right">{p.receipt_url && <ReceiptLink kind="subscription" paymentId={p.id} />}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <ul className="flex flex-col gap-3 md:hidden">
              {rows.map((p) => (
                <li key={p.id} className="rounded-input border border-line p-3 text-sm">
                  <div className="flex justify-between"><span>{formatDate(p.paid_at ?? p.created_at)}</span><span className="font-semibold">{formatINR(p.amount_paise)}</span></div>
                  <div className="mt-1 flex items-center justify-between"><Badge variant={p.status === "paid" ? "open" : p.status === "failed" ? "cancelled" : "neutral"}>{p.status}</Badge>{p.receipt_url && <ReceiptLink kind="subscription" paymentId={p.id} />}</div>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>

      <section aria-label="Questions">
        <h2 className="mb-2 font-display text-xl font-bold">Questions</h2>
        <Accordion type="single" collapsible>
          {FAQ.map(([q, a]) => (
            <AccordionItem key={q} value={q}><AccordionTrigger>{q}</AccordionTrigger><AccordionContent>{a}</AccordionContent></AccordionItem>
          ))}
        </Accordion>
      </section>
    </div>
  );
}
