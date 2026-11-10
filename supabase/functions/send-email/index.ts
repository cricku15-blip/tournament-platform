// supabase/functions/send-email/index.ts   (service-role only; called by other functions and cron)
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { isServiceCall, json } from "../_shared/clients.ts";

serve(async (req) => {
  if (!isServiceCall(req)) return json({ error: "forbidden" }, 403);
  const { to, subject, title, body, cta_label, cta_url } = await req.json();
  const html = `<div style="font-family:system-ui,sans-serif;max-width:520px;margin:auto;color:#10291E">
    <h2>${title ?? subject}</h2><p style="line-height:1.55">${body ?? ""}</p>
    ${cta_url ? `<p><a href="${cta_url}" style="background:#0A7F52;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none">${cta_label ?? "Open"}</a></p>` : ""}
  </div>`;
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${Deno.env.get("RESEND_API_KEY")}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: Deno.env.get("EMAIL_FROM") ?? "Tournaments <noreply@example.com>", to, subject, html }),
  });
  return json({ ok: res.ok }, res.ok ? 200 : 502);
});
