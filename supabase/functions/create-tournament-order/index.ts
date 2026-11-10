// supabase/functions/create-tournament-order/index.ts
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { adminClient, getUser, json, handleOptions } from "../_shared/clients.ts";
import { rzp, razorpayKeyId, withTax } from "../_shared/razorpay.ts";

serve(async (req) => {
  const pre = handleOptions(req); if (pre) return pre;
  try {
    const user = await getUser(req);
    if (!user) return json({ error: "not_authenticated" }, 401);
    const { tournament_id, target_team_count } = await req.json();
    const sb = adminClient();

    const { data: t } = await sb.from("tournaments")
      .select("id, name, organizer_id, status, team_count, pricing_tier_id").eq("id", tournament_id).single();
    if (!t || t.organizer_id !== user.id) return json({ error: "forbidden" }, 403);

    let kind: "initial" | "upgrade"; let teamCount: number;
    if (t.status === "draft") { kind = "initial"; teamCount = t.team_count; }
    else if (["paid", "registration_open", "registration_closed"].includes(t.status) && Number(target_team_count) > t.team_count) {
      kind = "upgrade"; teamCount = Number(target_team_count);
    } else return json({ error: "invalid_status" }, 409);

    const { data: tier } = await sb.from("pricing_tiers").select("*")
      .eq("is_active", true).lte("min_teams", teamCount).gte("max_teams", teamCount).maybeSingle();
    if (!tier) return json({ error: "no_pricing_tier_for_team_count" }, 422);

    let base = tier.amount_paise;
    if (kind === "upgrade") {
      const { data: cur } = await sb.from("pricing_tiers").select("amount_paise").eq("id", t.pricing_tier_id).single();
      base = Math.max(tier.amount_paise - (cur?.amount_paise ?? 0), 0);
    }
    const { data: taxRow } = await sb.from("site_settings").select("value").eq("key", "tax").single();
    const { amount, tax, total } = withTax(base, taxRow?.value?.percent ?? 0, taxRow?.value?.prices_include_tax ?? false);
    if (total < 100) return json({ error: "amount_too_low" }, 422);          // Razorpay minimum is 1 rupee

    // Reuse a recent unpaid order for the same thing (prevents duplicate orders on double click)
    const since = new Date(Date.now() - 30 * 60 * 1000).toISOString();
    const { data: existing } = await sb.from("tournament_payments").select("razorpay_order_id, total_paise")
      .eq("tournament_id", t.id).eq("status", "created").eq("kind", kind).eq("total_paise", total).gte("created_at", since)
      .order("created_at", { ascending: false }).limit(1).maybeSingle();
    if (existing?.razorpay_order_id) {
      return json({ order_id: existing.razorpay_order_id, amount: total, currency: "INR", key_id: razorpayKeyId, name: t.name });
    }

    const order = await rzp("/orders", "POST", {
      amount: total, currency: "INR", receipt: `t_${t.id.slice(0, 8)}_${Date.now()}`,
      notes: { tournament_id: t.id, organizer_id: user.id, kind },
    });
    const { error } = await sb.from("tournament_payments").insert({
      tournament_id: t.id, organizer_id: user.id, tier_id: tier.id, kind, target_team_count: kind === "upgrade" ? teamCount : null,
      amount_paise: amount, tax_paise: tax, total_paise: total, razorpay_order_id: order.id,
    });
    if (error) throw error;
    return json({ order_id: order.id, amount: total, currency: "INR", key_id: razorpayKeyId, name: t.name });
  } catch (e) {
    console.error("create-tournament-order", e);
    return json({ error: "server_error" }, 500);
  }
});
