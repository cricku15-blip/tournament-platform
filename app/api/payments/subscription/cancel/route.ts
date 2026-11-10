import { revalidatePath } from "next/cache";
import { callEdge } from "@/lib/payments/edge";
import { guard, jsonErr, jsonOk } from "@/lib/payments/http";

export async function POST() {
  const g = await guard("subcancel", 5);
  if ("error" in g) return g.error;
  const r = await callEdge<{ ok: boolean; ends_at: string | null }>("cancel-subscription", {});
  if (!r.ok) return jsonErr(r.error, r.status === 401 ? 401 : r.status >= 500 ? 502 : r.status);
  revalidatePath("/subscription");
  return jsonOk({ ok: true, endsAt: r.data.ends_at });
}
