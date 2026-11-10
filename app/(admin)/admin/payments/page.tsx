import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/admin/guard";
import { createAdminClient } from "@/lib/supabase/admin";
import { DataTable, Field, FilterForm, MoreLink, PageHead, Panel, Pill, inputCls, td } from "@/components/domain/admin/ui";
import { ReasonAction } from "@/components/domain/admin/reason-action";
import { CopyButton } from "@/components/ui/copy-button";
import { markForRefund } from "../actions";
import { decodeCursor, encodeCursor, keysetFilter } from "@/lib/pagination/keyset";
import { formatDateTime, formatINR } from "@/lib/format";

export const metadata: Metadata = { title: "Payments | Admin", robots: { index: false } };
const PAGE = 30;

export default async function AdminPayments({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  await requireAdmin();
  const sp = await searchParams;
  const db = createAdminClient();
  const status = ["created", "paid", "failed", "refunded"].includes(sp.status ?? "") ? sp.status : undefined;
  const q = (sp.q ?? "").trim().slice(0, 60);
  const cursor = decodeCursor(sp.cursor);

  let query = db.from("tournament_payments").select("id, tournament_id, organizer_id, kind, total_paise, status, razorpay_order_id, razorpay_payment_id, paid_at, created_at").order("created_at", { ascending: false }).order("id", { ascending: false }).limit(PAGE + 1);
  if (status) query = query.eq("status", status as "paid");
  if (q) query = query.or(`razorpay_order_id.eq.${q.replace(/[^A-Za-z0-9_]/g, "")},razorpay_payment_id.eq.${q.replace(/[^A-Za-z0-9_]/g, "")}`);
  if (cursor) query = query.or(keysetFilter(cursor));
  const [{ data }, hooks] = await Promise.all([query, db.from("webhook_events").select("id, type, event_id, error, processed_at, created_at").order("created_at", { ascending: false }).limit(15)]);
  const rows = (data ?? []).slice(0, PAGE);
  const last = rows[rows.length - 1];
  const more = (data ?? []).length > PAGE && last ? `/admin/payments?${new URLSearchParams({ ...(status ? { status } : {}), ...(q ? { q } : {}), cursor: encodeCursor({ t: last.created_at, id: last.id }) })}` : null;
  const tnames = new Map<string, string>();
  const tids = [...new Set(rows.map((r) => r.tournament_id))];
  if (tids.length) for (const t of (await db.from("tournaments").select("id, name").in("id", tids)).data ?? []) tnames.set(t.id, t.name);

  return (
    <div className="mx-auto max-w-6xl">
      <PageHead title="Organizer payments" actions={<a className="inline-flex min-h-11 items-center rounded-input border border-line px-4 text-sm font-semibold hover:bg-surface" href={`/admin/payments/export${status ? `?status=${status}` : ""}`}>Download CSV</a>} />
      <FilterForm action="/admin/payments">
        <Field label="Razorpay ID"><input name="q" defaultValue={q} className={inputCls} placeholder="order_… or pay_…" /></Field>
        <Field label="Status"><select name="status" defaultValue={status ?? ""} className={inputCls}><option value="">Any</option><option value="paid">Paid</option><option value="created">Created</option><option value="failed">Failed</option><option value="refunded">Refunded</option></select></Field>
      </FilterForm>
      <DataTable caption="Organizer payments" head={["When", "Tournament", "Amount", "Status", "Razorpay IDs", ""]}>
        {rows.map((p) => (
          <tr key={p.id}>
            <td className={td}>{formatDateTime(p.paid_at ?? p.created_at)}</td>
            <td className={td}><Link className="text-primary hover:underline" href={`/admin/tournaments/${p.tournament_id}`}>{tnames.get(p.tournament_id) ?? "Tournament"}</Link><span className="block text-xs text-muted">{p.kind}</span></td>
            <td className={td}>{formatINR(p.total_paise)}</td>
            <td className={td}><Pill tone={p.status === "paid" ? "good" : p.status === "failed" ? "bad" : "neutral"}>{p.status}</Pill></td>
            <td className={td}>
              {p.razorpay_order_id && <span className="flex items-center gap-1 text-xs">{p.razorpay_order_id}<CopyButton value={p.razorpay_order_id} variant="ghost" size="sm" /></span>}
              {p.razorpay_payment_id && <span className="flex items-center gap-1 text-xs"><a className="text-primary hover:underline" href={`https://dashboard.razorpay.com/app/payments/${p.razorpay_payment_id}`} target="_blank" rel="noopener noreferrer">{p.razorpay_payment_id}</a><CopyButton value={p.razorpay_payment_id} variant="ghost" size="sm" /></span>}
            </td>
            <td className={td}>{p.status === "paid" && <ReasonAction label="Mark for refund" action={(i) => markForRefund("tournament", p.id, { reason: i.reason })} />}</td>
          </tr>
        ))}
        {rows.length === 0 && <tr><td colSpan={6} className="px-3 py-6 text-center text-muted">No payments.</td></tr>}
      </DataTable>
      <MoreLink href={more}>Load more</MoreLink>
      <div className="mt-6">
        <Panel title="Recent webhook events">
          <DataTable caption="Webhook events" head={["When", "Type", "Event", "Result"]}>
            {(hooks.data ?? []).map((h) => (
              <tr key={h.id}><td className={td}>{formatDateTime(h.created_at)}</td><td className={td}>{h.type ?? "–"}</td><td className={td}><span className="text-xs">{h.event_id}</span></td><td className={td}>{h.error ? <Pill tone="bad">{h.error.slice(0, 80)}</Pill> : h.processed_at ? <Pill tone="good">processed</Pill> : <Pill tone="warn">pending</Pill>}</td></tr>
            ))}
          </DataTable>
        </Panel>
      </div>
    </div>
  );
}
