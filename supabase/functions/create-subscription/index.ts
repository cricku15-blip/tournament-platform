// supabase/functions/create-subscription/index.ts
// One-time 30-day player pass: creates a Razorpay ORDER (no auto-renew). The webhook activates the pass.
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { adminClient, getUser, json, handleOptions } from "../_shared/clients.ts";
import { rzp, razorpayKeyId } from "../_shared/razorpay.ts";

serve(async (req) => {
  const pre = handleOptions(req); if (pre) return pre;
  try {
    const user = await getUser(req);
    if (!user) return json({ error: "not_authenticated" }, 401);
    const sb = adminClient();

    const { data: plan } = await sb.from("player_plans").select("id, name, amount_paise").eq("is_active", true).order("version", { ascending: false }).limit(1).maybeSingle();
    if (!plan) return json({ error: "no_active_plan" }, 422);
    if (plan.amount_paise < 100) return json({ error: "amount_too_low" }, 422);

    const { data: current } = await sb.from("subscriptions").select("id, status, current_period_end, razorpay_order_id, created_at")
      .eq("user_id", user.id).order("created_at", { ascending: false }).limit(1).maybeSingle();
    if (current?.status === "active" && current.current_period_end && new Date(current.current_period_end) > new Date()) {
      return json({ error: "already_subscribed" }, 409);
    }
    // Reuse an unfinished checkout from the last 30 minutes (double click safe)
    if (current?.status === "created" && current.razorpay_order_id && Date.now() - new Date(current.created_at).getTime() < 30 * 60 * 1000) {
      return json({ order_id: current.razorpay_order_id, amount: plan.amount_paise, currency: "INR", key_id: razorpayKeyId });
    }

    const order = await rzp("/orders", "POST", {
      amount: plan.amount_paise, currency: "INR", receipt: `p_${user.id.slice(0, 8)}_${Date.now()}`,
      notes: { kind: "player_pass", user_id: user.id },
    });
    const { error } = await sb.from("subscriptions").insert({ user_id: user.id, plan_id: plan.id, razorpay_order_id: order.id, status: "created" });
    if (error) throw error;
    return json({ order_id: order.id, amount: plan.amount_paise, currency: "INR", key_id: razorpayKeyId });
  } catch (e) {
    console.error("create-subscription", e);
    return json({ error: "server_error" }, 500);
  }
});
