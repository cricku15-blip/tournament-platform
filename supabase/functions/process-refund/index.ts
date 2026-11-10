// supabase/functions/process-refund/index.ts   (admin only)
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { adminClient, getUser, isAdmin, json, handleOptions } from "../_shared/clients.ts";
import { rzp } from "../_shared/razorpay.ts";

serve(async (req) => {
  const pre = handleOptions(req); if (pre) return pre;
  try {
    const user = await getUser(req);
    if (!user || !(await isAdmin(user.id))) return json({ error: "forbidden" }, 403);
    const { refund_id, action, reason } = await req.json();       // action: 'approve' | 'reject'
    const sb = adminClient();
    const { data: r } = await sb.from("refunds").select("*").eq("id", refund_id).single();
    if (!r || r.status !== "requested") return json({ error: "invalid_status" }, 409);

    if (action === "reject") {
      if (!reason) return json({ error: "reason_required" }, 422);
      await sb.from("refunds").update({ status: "rejected", reject_reason: reason, reviewed_by: user.id }).eq("id", r.id);
      await sb.from("audit_log").insert({ actor_id: user.id, action: "refund_rejected", target_type: "refund", target_id: r.id, reason });
      return json({ ok: true });
    }

    const table = r.payment_type === "tournament" ? "tournament_payments" : "subscription_payments";
    const { data: p } = await sb.from(table).select("*").eq("id", r.payment_id).single();
    if (!p?.razorpay_payment_id || p.status !== "paid") return json({ error: "payment_not_refundable" }, 409);

    const rf = await rzp(`/payments/${p.razorpay_payment_id}/refund`, "POST", { notes: { refund_id: r.id, reason: r.reason ?? "" } });
    await sb.from("refunds").update({ status: "approved", razorpay_refund_id: rf.id, reviewed_by: user.id }).eq("id", r.id);
    await sb.from("audit_log").insert({ actor_id: user.id, action: "refund_approved", target_type: "refund", target_id: r.id, after: { razorpay_refund_id: rf.id } });
    return json({ ok: true, razorpay_refund_id: rf.id });   // final status 'processed' arrives via the refund.processed webhook
  } catch (e) {
    console.error("process-refund", e);
    return json({ error: "server_error" }, 500);
  }
});
