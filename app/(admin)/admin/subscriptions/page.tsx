import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/admin/guard";
import { createAdminClient } from "@/lib/supabase/admin";
import { DataTable, Field, FilterForm, MoreLink, PageHead, Pill, inputCls, td } from "@/components/domain/admin/ui";
import { ReasonAction } from "@/components/domain/admin/reason-action";
import { cancelSubscriptionAdmin, grantFreePeriod } from "../actions";
import { decodeCursor, encodeCursor, keysetFilter } from "@/lib/pagination/keyset";
import { formatDate } from "@/lib/format";

export const metadata: Metadata = { title: "Subscriptions | Admin", robots: { index: false } };
const PAGE = 30;
const STATUSES = ["created", "active", "past_due", "cancelled", "expired"];

export default async function AdminSubscriptions({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  await requireAdmin();
  const sp = await searchParams;
  const db = createAdminClient();
  const status = STATUSES.includes(sp.status ?? "") ? sp.status : undefined;
  const cursor = decodeCursor(sp.cursor);
  let query = db.from("subscriptions").select("id, user_id, status, current_period_end, cancel_at_period_end, grace_until, created_at").order("created_at", { ascending: false }).order("id", { ascending: false }).limit(PAGE + 1);
  if (status) query = query.eq("status", status as "active");
  if (cursor) query = query.or(keysetFilter(cursor));
  const { data } = await query;
  const rows = (data ?? []).slice(0, PAGE);
  const last = rows[rows.length - 1];
  const more = (data ?? []).length > PAGE && last ? `/admin/subscriptions?${new URLSearchParams({ ...(status ? { status } : {}), cursor: encodeCursor({ t: last.created_at, id: last.id }) })}` : null;
  const names = new Map<string, string>();
  const uids = [...new Set(rows.map((r) => r.user_id))];
  if (uids.length) for (const p of (await db.from("profiles").select("id, full_name, username").in("id", uids)).data ?? []) names.set(p.id, p.full_name ?? p.username ?? "User");

  return (
    <div className="mx-auto max-w-6xl">
      <PageHead title="Player subscriptions" />
      <FilterForm action="/admin/subscriptions">
        <Field label="Status"><select name="status" defaultValue={status ?? ""} className={inputCls}><option value="">Any</option>{STATUSES.map((s) => <option key={s}>{s}</option>)}</select></Field>
      </FilterForm>
      <DataTable caption="Subscriptions" head={["User", "Status", "Period ends", "Grace until", ""]}>
        {rows.map((s) => (
          <tr key={s.id}>
            <td className={td}><Link className="text-primary hover:underline" href={`/admin/users/${s.user_id}`}>{names.get(s.user_id) ?? "User"}</Link></td>
            <td className={td}><Pill tone={s.status === "active" ? "good" : s.status === "past_due" ? "warn" : "neutral"}>{s.status}</Pill>{s.cancel_at_period_end && <span className="ml-1 text-xs text-muted">cancelling</span>}</td>
            <td className={td}>{s.current_period_end ? formatDate(s.current_period_end) : "–"}</td>
            <td className={td}>{s.grace_until ? formatDate(s.grace_until) : "–"}</td>
            <td className={`${td} flex flex-wrap gap-2`}>
              <ReasonAction label="Grant free period" fields={[{ name: "days", label: "Days to add", type: "number", defaultValue: "30", required: true }]} action={(i) => grantFreePeriod(s.id, { days: i.days, reason: i.reason })} />
              {s.status === "active" && !s.cancel_at_period_end && <ReasonAction label="Cancel" variant="destructive" description="Cancelled at the end of the paid period." action={(i) => cancelSubscriptionAdmin(s.id, { reason: i.reason })} />}
            </td>
          </tr>
        ))}
        {rows.length === 0 && <tr><td colSpan={5} className="px-3 py-6 text-center text-muted">No subscriptions.</td></tr>}
      </DataTable>
      <MoreLink href={more}>Load more</MoreLink>
    </div>
  );
}
