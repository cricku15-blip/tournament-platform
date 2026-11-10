// supabase/functions/create-subscription/index.ts
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { adminClient, getUser, json, handleOptions } from "../_shared/clients.ts";
import { rzp, razorpayKeyId } from "../_shared/razorpay.ts";

serve(async (req) => {
  const pre = handleOptions(req); if (pre) return pre;
  try {
    const user = await getUser(req);
    if (!user) return json({ error: "not_authenticated" }, 401);
    const sb = adminClient();

    const { data: plan } = await sb.from("player_plans").select("*").eq("is_active", true).order("version", { ascending: false }).limit(1).maybeSingle();
    if (!plan) return json({ error: "no_active_plan" }, 422);

    const { data: current } = await sb.from("subscriptions").select("*").eq("user_id", user.id)
      .in("status", ["created", "active", "past_due", "cancelled"]).order("created_at", { ascending: false }).limit(1).maybeSingle();
    if (current?.status === "active" && !current.cancel_at_period_end) return json({ error: "already_subscribed" }, 409);
    // Reuse an unfinished checkout from the last 24h
    if (current?.status === "created" && Date.now() - new Date(current.created_at).getTime() < 24 * 3600 * 1000) {
      return json({ subscription_id: current.razorpay_subscription_id, key_id: razorpayKeyId });
    }

    let planId = plan.razorpay_plan_id as string | null;
    if (!planId) {
      const p = await rzp("/plans", "POST", {
        period: "monthly", interval: 1,
        item: { name: plan.name, amount: plan.amount_paise, currency: "INR", description: plan.description ?? "" },
      });
      planId = p.id;
      await sb.from("player_plans").update({ razorpay_plan_id: planId }).eq("id", plan.id);
    }

    // Resuming after cancel: new subscription starts when the paid period ends
    const startAt = current?.status === "cancelled" && current.current_period_end && new Date(current.current_period_end) > new Date()
      ? Math.floor(new Date(current.current_period_end).getTime() / 1000) : undefined;

    const sub = await rzp("/subscriptions", "POST", {
      plan_id: planId, total_count: 120, quantity: 1, customer_notify: 1, start_at: startAt, notes: { user_id: user.id },
    });
    const { error } = await sb.from("subscriptions").insert({ user_id: user.id, plan_id: plan.id, razorpay_subscription_id: sub.id, status: "created" });
    if (error) throw error;
    return json({ subscription_id: sub.id, key_id: razorpayKeyId });
  } catch (e) {
    console.error("create-subscription", e);
    return json({ error: "server_error" }, 500);
  }
});
