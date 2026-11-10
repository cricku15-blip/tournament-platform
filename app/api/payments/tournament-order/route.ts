import { z } from "zod";
import { callEdge } from "@/lib/payments/edge";
import { guard, jsonErr, jsonOk } from "@/lib/payments/http";

const body = z.object({ tournamentId: z.string().uuid(), targetTeamCount: z.number().int().min(3).max(500).optional() });

export async function POST(request: Request) {
  const g = await guard("order");
  if ("error" in g) return g.error;
  const parsed = body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return jsonErr("bad_request", 400);

  const r = await callEdge<{ order_id: string; amount: number; currency: string; key_id: string; name: string }>("create-tournament-order", {
    tournament_id: parsed.data.tournamentId,
    target_team_count: parsed.data.targetTeamCount,
  });
  if (!r.ok) return jsonErr(r.error, r.status === 401 ? 401 : r.status >= 500 ? 502 : r.status);
  return jsonOk({ orderId: r.data.order_id, amount: r.data.amount, keyId: r.data.key_id, name: r.data.name });
}
