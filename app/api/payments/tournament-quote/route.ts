import { NextRequest } from "next/server";
import { z } from "zod";
import { guard, jsonErr, jsonOk } from "@/lib/payments/http";
import { withTax } from "@/lib/payments/tax";

/** Server-side price preview for the checkout summary. The charged amount always comes from create-tournament-order. */
export async function GET(request: NextRequest) {
  const g = await guard("quote", 30);
  if ("error" in g) return g.error;
  const id = z.string().uuid().safeParse(request.nextUrl.searchParams.get("id"));
  const target = Number(request.nextUrl.searchParams.get("target") ?? "") || null;
  if (!id.success) return jsonErr("bad_request", 400);

  const { supabase } = g;
  const { data: t } = await supabase.from("tournaments").select("id, team_count, status, pricing_tier_id").eq("id", id.data).maybeSingle();
  if (!t) return jsonErr("not_found", 404);
  const teams = target && target > t.team_count ? target : t.team_count;
  const [tier, cur, tax] = await Promise.all([
    supabase.from("pricing_tiers").select("id, name, min_teams, max_teams, amount_paise").eq("is_active", true).lte("min_teams", teams).gte("max_teams", teams).maybeSingle(),
    t.pricing_tier_id ? supabase.from("pricing_tiers").select("amount_paise").eq("id", t.pricing_tier_id).maybeSingle() : Promise.resolve({ data: null }),
    supabase.from("site_settings").select("value").eq("key", "tax").maybeSingle(),
  ]);
  if (!tier.data) return jsonErr("no_pricing_tier_for_team_count", 422);
  const upgrade = teams > t.team_count && t.status !== "draft";
  const base = upgrade ? Math.max(tier.data.amount_paise - (cur.data?.amount_paise ?? 0), 0) : tier.data.amount_paise;
  const cfg = (tax.data?.value ?? {}) as { percent?: number; prices_include_tax?: boolean };
  const { amount, tax: taxPaise, total } = withTax(base, cfg.percent ?? 0, cfg.prices_include_tax ?? false);
  return jsonOk({ tierName: tier.data.name, minTeams: tier.data.min_teams, maxTeams: tier.data.max_teams, teams, amount, tax: taxPaise, taxPercent: cfg.percent ?? 0, total, upgrade });
}
