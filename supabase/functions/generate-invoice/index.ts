// supabase/functions/generate-invoice/index.ts   (service-role / admin only)
// v1 writes a printable HTML receipt to the private 'invoices' bucket. (Upgrade to PDF later.)
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { adminClient, isServiceCall, getUser, isAdmin, json, handleOptions } from "../_shared/clients.ts";

const rupees = (p: number) => "₹" + (p / 100).toLocaleString("en-IN", { minimumFractionDigits: 2 });

serve(async (req) => {
  const pre = handleOptions(req); if (pre) return pre;
  try {
    if (!isServiceCall(req)) {
      const u = await getUser(req);
      if (!u || !(await isAdmin(u.id))) return json({ error: "forbidden" }, 403);
    }
    const { payment_type, payment_id } = await req.json();
    const sb = adminClient();
    const isT = payment_type === "tournament";
    const { data: p } = await sb.from(isT ? "tournament_payments" : "subscription_payments").select("*").eq("id", payment_id).single();
    if (!p || p.status !== "paid") return json({ error: "not_paid" }, 409);
    const userId = isT ? p.organizer_id : p.user_id;
    const { data: prof } = await sb.from("profiles").select("full_name").eq("id", userId).single();
    const { data: tax } = await sb.from("site_settings").select("value").eq("key", "tax").single();
    const invNo = `INV-${new Date(p.paid_at ?? Date.now()).toISOString().slice(0, 7).replace("-", "")}-${p.id.slice(0, 6).toUpperCase()}`;
    const amount = isT ? p.amount_paise : p.amount_paise;
    const taxPaise = isT ? p.tax_paise : 0;
    const total = isT ? p.total_paise : p.amount_paise;
    const desc = isT ? "Tournament fee" : "Player subscription (monthly)";

    const html = `<!doctype html><meta charset="utf-8"><title>${invNo}</title>
<style>body{font-family:system-ui,sans-serif;max-width:640px;margin:40px auto;color:#0F2A43}table{width:100%;border-collapse:collapse}td,th{padding:10px;border-bottom:1px solid #DCE3EA;text-align:left}.r{text-align:right}</style>
<h1>Receipt ${invNo}</h1><p>Billed to: <b>${prof?.full_name ?? "Customer"}</b><br>Date: ${new Date(p.paid_at ?? Date.now()).toLocaleDateString("en-IN")}</p>
<table><tr><th>Description</th><th class="r">Amount</th></tr>
<tr><td>${desc}</td><td class="r">${rupees(amount)}</td></tr>
<tr><td>Tax (${tax?.value?.percent ?? 0}%)</td><td class="r">${rupees(taxPaise)}</td></tr>
<tr><th>Total paid</th><th class="r">${rupees(total)}</th></tr></table>
<p>Payment reference: ${p.razorpay_payment_id ?? "-"}</p>`;

    const path = `${userId}/${p.id}.html`;
    const { error } = await sb.storage.from("invoices").upload(path, new Blob([html], { type: "text/html" }), { upsert: true, contentType: "text/html" });
    if (error) throw error;
    await sb.from(isT ? "tournament_payments" : "subscription_payments").update(isT ? { invoice_url: path } : { receipt_url: path }).eq("id", p.id);
    return json({ ok: true, path });
  } catch (e) {
    console.error("generate-invoice", e);
    return json({ error: "server_error" }, 500);
  }
});
