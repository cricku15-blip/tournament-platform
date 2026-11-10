import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/admin/guard";
import { createAdminClient } from "@/lib/supabase/admin";
import { DataTable, Field, FilterForm, MoreLink, PageHead, td, inputCls } from "@/components/domain/admin/ui";
import { formatDateTime } from "@/lib/format";

export const metadata: Metadata = { title: "Audit log | Admin", robots: { index: false } };
const PAGE = 40;

/** Shallow before/after diff: only keys whose value changed. */
function diff(before: unknown, after: unknown): Array<[string, string, string]> {
  const b = (before && typeof before === "object" ? before : {}) as Record<string, unknown>;
  const a = (after && typeof after === "object" ? after : {}) as Record<string, unknown>;
  const keys = [...new Set([...Object.keys(b), ...Object.keys(a)])];
  return keys.filter((k) => JSON.stringify(b[k]) !== JSON.stringify(a[k])).map((k) => [k, b[k] === undefined ? "–" : JSON.stringify(b[k]), a[k] === undefined ? "–" : JSON.stringify(a[k])]);
}

export default async function AuditLog({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  await requireAdmin();
  const sp = await searchParams;
  const db = createAdminClient();
  const action = (sp.action ?? "").trim().slice(0, 60).replace(/[^a-z0-9_]/gi, "");
  const type = (sp.type ?? "").trim().slice(0, 30).replace(/[^a-z0-9_]/gi, "");
  const actor = /^[0-9a-f-]{36}$/i.test(sp.actor ?? "") ? sp.actor : undefined;
  const before = Number(sp.before) || null; // keyset on the identity column (monotonic with time)

  let query = db.from("audit_log").select("id, actor_id, action, target_type, target_id, before, after, reason, created_at").order("id", { ascending: false }).limit(PAGE + 1);
  if (action) query = query.ilike("action", `%${action}%`);
  if (type) query = query.eq("target_type", type);
  if (actor) query = query.eq("actor_id", actor);
  if (before) query = query.lt("id", before);
  const { data } = await query;
  const rows = (data ?? []).slice(0, PAGE);
  const last = rows[rows.length - 1];
  const more = (data ?? []).length > PAGE && last ? `/admin/audit-log?${new URLSearchParams({ ...(action ? { action } : {}), ...(type ? { type } : {}), ...(actor ? { actor } : {}), before: String(last.id) })}` : null;
  const aids = [...new Set(rows.map((r) => r.actor_id).filter((x): x is string => !!x))];
  const names = new Map<string, string>();
  if (aids.length) for (const p of (await db.from("profiles").select("id, full_name").in("id", aids)).data ?? []) names.set(p.id, p.full_name ?? "Admin");

  return (
    <div className="mx-auto max-w-6xl">
      <PageHead title="Audit log" subtitle="Read only. Rows can't be edited or deleted." />
      <FilterForm action="/admin/audit-log">
        <Field label="Action contains"><input name="action" defaultValue={action} className={inputCls} /></Field>
        <Field label="Target type"><input name="type" defaultValue={type} className={inputCls} placeholder="tournament, profile…" /></Field>
        <Field label="Actor ID"><input name="actor" defaultValue={actor ?? ""} className={inputCls} /></Field>
      </FilterForm>
      <DataTable caption="Audit log" head={["When", "Who", "Action", "Target", "Reason and changes"]}>
        {rows.map((r) => {
          const changes = diff(r.before, r.after);
          return (
            <tr key={r.id}>
              <td className={td}>{formatDateTime(r.created_at)}</td>
              <td className={td}>{r.actor_id ? <Link className="text-primary hover:underline" href={`/admin/users/${r.actor_id}`}>{names.get(r.actor_id) ?? "User"}</Link> : "System"}</td>
              <td className={td}>{r.action}</td>
              <td className={td}>{r.target_type ?? "–"}{r.target_id && <span className="block break-all text-xs text-muted">{r.target_id}</span>}</td>
              <td className={td}>
                {r.reason && <p>{r.reason}</p>}
                {changes.length > 0 && (
                  <details className="mt-1"><summary className="cursor-pointer text-xs font-semibold text-primary">{changes.length} change{changes.length === 1 ? "" : "s"}</summary>
                    <ul className="mt-1 text-xs">{changes.map(([k, b, a]) => <li key={k}><code>{k}</code>: <span className="text-danger line-through">{b}</span> → <span className="text-primary">{a}</span></li>)}</ul>
                  </details>
                )}
              </td>
            </tr>
          );
        })}
        {rows.length === 0 && <tr><td colSpan={5} className="px-3 py-6 text-center text-muted">Nothing logged yet.</td></tr>}
      </DataTable>
      <MoreLink href={more}>Load older</MoreLink>
    </div>
  );
}
