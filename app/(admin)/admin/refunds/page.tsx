import type { Metadata } from "next";
import { requireAdmin } from "@/lib/admin/guard";
import { createAdminClient } from "@/lib/supabase/admin";
import { DataTable, Field, FilterForm, PageHead, Pill, inputCls, td } from "@/components/domain/admin/ui";
import { ReasonAction } from "@/components/domain/admin/reason-action";
import { processRefund } from "../actions";
import { formatDateTime, formatINR } from "@/lib/format";

export const metadata: Metadata = { title: "Refunds | Admin", robots: { index: false } };

export default async function AdminRefunds({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  await requireAdmin();
  const sp = await searchParams;
  const db = createAdminClient();
  const status = ["requested", "approved", "processed", "rejected"].includes(sp.status ?? "") ? sp.status : "requested";
  const { data } = await db.from("refunds").select("id, payment_type, payment_id, requested_by, reason, status, reject_reason, razorpay_refund_id, created_at").eq("status", status as "requested").order("created_at", { ascending: true }).limit(100);
  const rows = data ?? [];
  const tIds = rows.filter((r) => r.payment_type === "tournament").map((r) => r.payment_id);
  const sIds = rows.filter((r) => r.payment_type === "subscription").map((r) => r.payment_id);
  const [tp, sp2] = await Promise.all([
    tIds.length ? db.from("tournament_payments").select("id, total_paise, status, paid_at, tournament_id").in("id", tIds) : Promise.resolve({ data: [] }),
    sIds.length ? db.from("subscription_payments").select("id, amount_paise, status, paid_at").in("id", sIds) : Promise.resolve({ data: [] }),
  ]);
  const pay = (r: (typeof rows)[number]) => (r.payment_type === "tournament" ? (tp.data ?? []).find((x) => x.id === r.payment_id) : (sp2.data ?? []).find((x) => x.id === r.payment_id));
  const amount = (r: (typeof rows)[number]) => { const p = pay(r) as { total_paise?: number; amount_paise?: number } | undefined; return p ? formatINR(p.total_paise ?? p.amount_paise ?? 0) : "–"; };
  const days = (r: (typeof rows)[number]) => { const p = pay(r) as { paid_at?: string | null } | undefined; return p?.paid_at ? Math.floor((Date.now() - new Date(p.paid_at).getTime()) / 86400000) : null; };

  return (
    <div className="mx-auto max-w-6xl">
      <PageHead title="Refunds" subtitle="Approving sends the refund to Razorpay. The final “processed” status arrives by webhook." />
      <FilterForm action="/admin/refunds">
        <Field label="Status"><select name="status" defaultValue={status} className={inputCls}><option value="requested">Requested</option><option value="approved">Approved (waiting for Razorpay)</option><option value="processed">Processed</option><option value="rejected">Rejected</option></select></Field>
      </FilterForm>
      <DataTable caption="Refund requests" head={["Requested", "Type", "Amount", "Paid", "Reason", "Status", ""]}>
        {rows.map((r) => (
          <tr key={r.id}>
            <td className={td}>{formatDateTime(r.created_at)}</td><td className={td}>{r.payment_type}</td><td className={td}>{amount(r)}</td>
            <td className={td}>{days(r) === null ? "–" : `${days(r)} days ago`}<span className="block text-xs text-muted">Check the Refund policy before approving</span></td>
            <td className={td}>{r.reason ?? "–"}{r.reject_reason && <span className="block text-xs text-muted">Rejected: {r.reject_reason}</span>}</td>
            <td className={td}><Pill tone={r.status === "processed" ? "good" : r.status === "rejected" ? "bad" : "warn"}>{r.status}</Pill></td>
            <td className={`${td} flex gap-2`}>
              {r.status === "requested" && (
                <>
                  <ReasonAction label="Approve" variant="primary" reasonLabel="Note (saved in the audit log)" action={(i) => processRefund(r.id, { decision: "approve", reason: i.reason })} />
                  <ReasonAction label="Reject" variant="destructive" reasonLabel="Reason (shown to the user)" action={(i) => processRefund(r.id, { decision: "reject", reason: i.reason })} />
                </>
              )}
            </td>
          </tr>
        ))}
        {rows.length === 0 && <tr><td colSpan={7} className="px-3 py-6 text-center text-muted">Nothing here.</td></tr>}
      </DataTable>
    </div>
  );
}
