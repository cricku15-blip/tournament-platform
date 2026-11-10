import { z } from "zod";
import { guard, jsonErr, jsonOk } from "@/lib/payments/http";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const g = await guard("tstatus", 60);
  if ("error" in g) return g.error;
  const id = z.string().uuid().safeParse((await ctx.params).id);
  if (!id.success) return jsonErr("bad_request", 400);
  const { data: t } = await g.supabase.from("tournaments").select("status, team_count").eq("id", id.data).maybeSingle();
  if (!t) return jsonErr("not_found", 404);
  const { data: p } = await g.supabase.from("tournament_payments").select("status, kind, target_team_count").eq("tournament_id", id.data).order("created_at", { ascending: false }).limit(1).maybeSingle();
  // Paid only once the verified webhook has flipped the payment row (and, for initial fees, the tournament status).
  const paid = p?.status === "paid" && (p.kind === "upgrade" ? t.team_count >= (p.target_team_count ?? 0) : t.status !== "draft");
  return jsonOk({ paid, tournamentStatus: t.status, paymentStatus: p?.status ?? null });
}
