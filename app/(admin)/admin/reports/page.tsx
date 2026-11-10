import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/admin/guard";
import { createAdminClient } from "@/lib/supabase/admin";
import { Field, FilterForm, MoreLink, PageHead, Panel, Pill, inputCls } from "@/components/domain/admin/ui";
import { ReasonAction } from "@/components/domain/admin/reason-action";
import { resolveReport } from "../actions";
import { decodeCursor, encodeCursor, keysetFilter } from "@/lib/pagination/keyset";
import { formatDateTime } from "@/lib/format";

export const metadata: Metadata = { title: "Reports | Admin", robots: { index: false } };
const PAGE = 20;

export default async function AdminReports({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  await requireAdmin();
  const sp = await searchParams;
  const db = createAdminClient();
  const status = ["open", "reviewing", "resolved", "dismissed"].includes(sp.status ?? "") ? sp.status : "open";
  const cursor = decodeCursor(sp.cursor);
  let query = db.from("reports").select("id, reporter_id, target_type, target_id, reason, snapshot, status, note, created_at").eq("status", status as "open").order("created_at", { ascending: false }).order("id", { ascending: false }).limit(PAGE + 1);
  if (cursor) query = query.or(keysetFilter(cursor));
  const { data } = await query;
  const rows = (data ?? []).slice(0, PAGE);
  const last = rows[rows.length - 1];
  const more = (data ?? []).length > PAGE && last ? `/admin/reports?${new URLSearchParams({ status: String(status), cursor: encodeCursor({ t: last.created_at, id: last.id }) })}` : null;

  // How many reports point at the same target.
  const targets = [...new Set(rows.map((r) => r.target_id).filter((x): x is string => !!x))];
  const counts = new Map<string, number>();
  if (targets.length) for (const r of (await db.from("reports").select("target_id").in("target_id", targets).limit(2000)).data ?? []) if (r.target_id) counts.set(r.target_id, (counts.get(r.target_id) ?? 0) + 1);
  const reporters = new Map<string, string>();
  const rids = [...new Set(rows.map((r) => r.reporter_id).filter((x): x is string => !!x))];
  if (rids.length) for (const p of (await db.from("profiles").select("id, full_name, username").in("id", rids)).data ?? []) reporters.set(p.id, p.full_name ?? p.username ?? "User");

  const actions = [
    { value: "dismiss", label: "Dismiss" }, { value: "resolve", label: "Resolve, no action" }, { value: "delete_content", label: "Delete the message" },
    { value: "mute_user", label: "Mute the user for 24 h" }, { value: "suspend_user", label: "Suspend the user" }, { value: "hide_tournament", label: "Hide the tournament" },
  ];

  return (
    <div className="mx-auto max-w-5xl">
      <PageHead title="Reports" />
      <FilterForm action="/admin/reports">
        <Field label="Status"><select name="status" defaultValue={status} className={inputCls}><option value="open">Open</option><option value="reviewing">Reviewing</option><option value="resolved">Resolved</option><option value="dismissed">Dismissed</option></select></Field>
      </FilterForm>
      <div className="flex flex-col gap-3">
        {rows.map((r) => {
          const snap = r.snapshot as { body?: string; username?: string; name?: string; slug?: string; user_id?: string };
          return (
            <Panel key={r.id}>
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <Pill tone="warn">{r.target_type}</Pill><Pill tone={r.status === "open" ? "warn" : "neutral"}>{r.status}</Pill>
                {r.target_id && (counts.get(r.target_id) ?? 0) > 1 && <Pill tone="bad">{counts.get(r.target_id)} reports on this</Pill>}
                <span className="text-muted">{formatDateTime(r.created_at)} · by {r.reporter_id ? reporters.get(r.reporter_id) ?? "user" : "deleted user"}</span>
              </div>
              <p className="mt-2 text-sm"><strong>Reason:</strong> {r.reason}</p>
              <div className="mt-2 rounded-input border border-line bg-surface p-3 text-sm" aria-label="Content at the time of the report">
                {snap.body ? <p className="whitespace-pre-wrap">{snap.body}</p> : snap.username ? <p>Profile: {snap.name} (@{snap.username})</p> : snap.slug ? <p>Tournament: {snap.name} <Link className="text-primary hover:underline" href={`/tournaments/${snap.slug}`} target="_blank">view</Link></p> : <p className="text-muted">No snapshot saved.</p>}
              </div>
              {r.note && <p className="mt-2 text-xs text-muted">Note: {r.note}</p>}
              {(r.status === "open" || r.status === "reviewing") && (
                <div className="mt-3"><ReasonAction label="Take action" variant="primary" reasonLabel="Internal note (saved with the report and the audit log)" fields={[{ name: "action", label: "Action", type: "select", options: actions }]} action={(i) => resolveReport(r.id, { action: i.action, reason: i.reason })} /></div>
              )}
            </Panel>
          );
        })}
        {rows.length === 0 && <p className="rounded-card border border-line bg-card p-6 text-center text-sm text-muted">No reports here.</p>}
      </div>
      <MoreLink href={more}>Load more</MoreLink>
    </div>
  );
}
