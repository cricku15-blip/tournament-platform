import { callEdge } from "@/lib/payments/edge";
import { guard, jsonErr, jsonOk } from "@/lib/payments/http";

export async function POST() {
  const g = await guard("sub");
  if ("error" in g) return g.error;
  const r = await callEdge<{ subscription_id: string; key_id: string }>("create-subscription", {});
  if (!r.ok) return jsonErr(r.error, r.status === 401 ? 401 : r.status >= 500 ? 502 : r.status);
  return jsonOk({ subscriptionId: r.data.subscription_id, keyId: r.data.key_id });
}
