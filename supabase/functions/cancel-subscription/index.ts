// supabase/functions/cancel-subscription/index.ts
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { adminClient, getUser, json, handleOptions } from "../_shared/clients.ts";
import { rzp } from "../_shared/razorpay.ts";

serve(async (req) => {
  const pre = handleOptions(req); if (pre) return pre;
  try {
    const user = await getUser(req);
    if (!user) return json({ error: "not_authenticated" }, 401);
    const sb = adminClient();
    const { data: sub } = await sb.from("subscriptions").select("*").eq("user_id", user.id).eq("status", "active")
      .order("created_at", { ascending: false }).limit(1).maybeSingle();
    if (!sub) return json({ error: "no_active_subscription" }, 404);
    await rzp(`/subscriptions/${sub.razorpay_subscription_id}/cancel`, "POST", { cancel_at_cycle_end: 1 });
    await sb.from("subscriptions").update({ cancel_at_period_end: true }).eq("id", sub.id);
    return json({ ok: true, ends_at: sub.current_period_end });
  } catch (e) {
    console.error("cancel-subscription", e);
    return json({ error: "server_error" }, 500);
  }
});
