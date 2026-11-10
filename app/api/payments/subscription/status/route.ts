import { guard, jsonOk } from "@/lib/payments/http";
import { subscriptionView } from "@/lib/payments/eligibility";

export async function GET() {
  const g = await guard("substatus", 60);
  if ("error" in g) return g.error;
  const { data } = await g.supabase.from("subscriptions").select("status, cancel_at_period_end, current_period_end, grace_until").eq("user_id", g.user.id).order("created_at", { ascending: false }).limit(1).maybeSingle();
  const view = subscriptionView(data);
  return jsonOk({ active: view === "active" || view === "cancelling", view });
}
