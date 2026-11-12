// supabase/functions/razorpay-webhook/index.ts   (deploy with verify_jwt = false)
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { adminClient } from "../_shared/clients.ts";
import { verifySignature } from "../_shared/razorpay.ts";

serve(async (req) => {
  const raw = await req.text();
  const signature = req.headers.get("x-razorpay-signature") ?? "";
  const eventId = req.headers.get("x-razorpay-event-id") ?? "";
  if (!(await verifySignature(raw, signature, Deno.env.get("RAZORPAY_WEBHOOK_SECRET")!))) {
    return new Response("invalid signature", { status: 400 });
  }
  const sb = adminClient();
  const event = JSON.parse(raw);

  // Idempotency: store first; skip events we've fully processed already
  const { data: existing } = await sb.from("webhook_events").select("id, processed_at").eq("provider", "razorpay").eq("event_id", eventId).maybeSingle();
  if (existing?.processed_at) return new Response("duplicate", { status: 200 });
  const rowId = existing?.id ?? (await sb.from("webhook_events").insert({ provider: "razorpay", event_id: eventId, type: event.event, payload: event }).select("id").single()).data?.id;

  try {
    const pay = event.payload?.payment?.entity;
    const sub = event.payload?.subscription?.entity;

    switch (event.event) {
      case "payment.captured":
      case "order.paid": {
        const orderId = pay?.order_id ?? event.payload?.order?.entity?.id;
        const paymentId = pay?.id;
        if (orderId) {
          const { data: tp } = await sb.from("tournament_payments").select("id").eq("razorpay_order_id", orderId).maybeSingle();
          if (tp) {
            const { error } = await sb.rpc("confirm_tournament_payment", { p_order_id: orderId, p_payment_id: paymentId });
            if (error) throw error;
            sb.functions.invoke("generate-invoice", { body: { payment_type: "tournament", payment_id: tp.id } }).catch(console.error);
          } else {
            // One-time 30-day player pass
            const { data: pass } = await sb.from("subscriptions").select("id, user_id, status").eq("razorpay_order_id", orderId).maybeSingle();
            if (pass && pay) {
              if (pass.status === "created" || pass.status === "expired") {
                await sb.from("subscriptions").update({
                  status: "active", cancel_at_period_end: false, grace_until: null,
                  current_period_end: new Date(Date.now() + 30 * 86400000).toISOString(),
                }).eq("id", pass.id);
              }
              const { data: sp } = await sb.from("subscription_payments").upsert({
                subscription_id: pass.id, user_id: pass.user_id, amount_paise: pay.amount, status: "paid",
                razorpay_payment_id: pay.id, paid_at: new Date().toISOString(),
              }, { onConflict: "razorpay_payment_id" }).select("id").single();
              if (sp) sb.functions.invoke("generate-invoice", { body: { payment_type: "subscription", payment_id: sp.id } }).catch(console.error);
            }
          }
        }
        break;
      }
      case "payment.failed": {
        if (pay?.order_id) {
          await sb.from("tournament_payments").update({ status: "failed", failure_reason: pay.error_description ?? "failed" })
            .eq("razorpay_order_id", pay.order_id).eq("status", "created");
        }
        break;
      }
      case "subscription.activated":
      case "subscription.charged": {
        const { data: row } = await sb.from("subscriptions").select("id, user_id, plan_id").eq("razorpay_subscription_id", sub.id).maybeSingle();
        if (row) {
          await sb.from("subscriptions").update({
            status: "active", grace_until: null,
            current_period_end: sub.current_end ? new Date(sub.current_end * 1000).toISOString() : null,
          }).eq("id", row.id);
          if (event.event === "subscription.charged" && pay) {
            const { data: sp } = await sb.from("subscription_payments").upsert({
              subscription_id: row.id, user_id: row.user_id, amount_paise: pay.amount, status: "paid",
              razorpay_payment_id: pay.id, paid_at: new Date().toISOString(),
            }, { onConflict: "razorpay_payment_id" }).select("id").single();
            if (sp) sb.functions.invoke("generate-invoice", { body: { payment_type: "subscription", payment_id: sp.id } }).catch(console.error);
          }
        }
        break;
      }
      case "subscription.pending": {
        const { data: row } = await sb.from("subscriptions").select("id, plan_id").eq("razorpay_subscription_id", sub.id).maybeSingle();
        if (row) {
          const { data: plan } = await sb.from("player_plans").select("grace_days").eq("id", row.plan_id).single();
          const grace = new Date(Date.now() + (plan?.grace_days ?? 0) * 86400000).toISOString();
          await sb.from("subscriptions").update({ status: "past_due", grace_until: grace }).eq("id", row.id);
        }
        break;
      }
      case "subscription.halted":
        await sb.from("subscriptions").update({ status: "expired" }).eq("razorpay_subscription_id", sub.id);
        break;
      case "subscription.cancelled":
      case "subscription.completed":
        await sb.from("subscriptions").update({
          status: "cancelled",
          current_period_end: sub.current_end ? new Date(sub.current_end * 1000).toISOString() : new Date().toISOString(),
        }).eq("razorpay_subscription_id", sub.id);
        break;
      case "refund.processed": {
        const refund = event.payload?.refund?.entity;
        if (refund) {
          await sb.from("refunds").update({ status: "processed", processed_at: new Date().toISOString() }).eq("razorpay_refund_id", refund.id);
          await sb.from("tournament_payments").update({ status: "refunded" }).eq("razorpay_payment_id", refund.payment_id);
          await sb.from("subscription_payments").update({ status: "refunded" }).eq("razorpay_payment_id", refund.payment_id);
        }
        break;
      }
    }
    await sb.from("webhook_events").update({ processed_at: new Date().toISOString(), error: null }).eq("id", rowId);
    return new Response("ok", { status: 200 });
  } catch (e) {
    console.error("webhook error", event.event, e);
    await sb.from("webhook_events").update({ error: String(e?.message ?? e) }).eq("id", rowId);
    return new Response("error", { status: 500 });      // Razorpay will retry
  }
});
