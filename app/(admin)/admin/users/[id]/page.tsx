import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/admin/guard";
import { createAdminClient } from "@/lib/supabase/admin";
import { DataTable, PageHead, Panel, Pill, td } from "@/components/domain/admin/ui";
import { ReasonAction } from "@/components/domain/admin/reason-action";
import { changeUserCity, sendUserEmail, setUserStatus } from "../../actions";
import { formatDate, formatDateTime, formatINR } from "@/lib/format";

export const metadata: Metadata = { title: "User | Admin", robots: { index: false } };

export default async function AdminUser({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const db = createAdminClient();
  const { data: p } = await db.from("profiles").select("*").eq("id", id).maybeSingle();
  if (!p) notFound();
  const [{ data: auth }, cities, org, mgr, squads, subs, tpay, reports, audit] = await Promise.all([
    db.auth.admin.getUserById(id),
    db.from("cities").select("id, name").order("name").limit(200),
    db.from("tournaments").select("id, name, status").eq("organizer_id", id).limit(20),
    db.from("teams").select("id, name, status, tournament_id").eq("manager_id", id).limit(20),
    db.from("squad_members").select("team_id, tournament_id").eq("user_id", id).limit(20),
    db.from("subscriptions").select("id, status, current_period_end, created_at").eq("user_id", id).order("created_at", { ascending: false }).limit(5),
    db.from("tournament_payments").select("id, total_paise, status, paid_at, created_at").eq("organizer_id", id).order("created_at", { ascending: false }).limit(10),
    db.from("reports").select("id, target_type, reason, status, created_at").or(`reporter_id.eq.${id},target_id.eq.${id}`).order("created_at", { ascending: false }).limit(10),
    db.from("audit_log").select("id, action, reason, created_at").eq("target_id", id).order("created_at", { ascending: false }).limit(15),
  ]);
  const suspendedUntil = (p as { suspended_until?: string | null }).suspended_until;
  const cityName = cities.data?.find((c) => c.id === p.city_id)?.name ?? "–";

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-4">
      <PageHead title={p.full_name ?? "(no name)"} subtitle={`${p.username ? `@${p.username} · ` : ""}${auth.user?.email ?? "no email"}`} actions={<Link href="/admin/users" className="text-sm font-semibold text-primary hover:underline">All users</Link>} />
      <Panel>
        <dl className="grid grid-cols-2 gap-3 text-sm md:grid-cols-4">
          <div><dt className="text-muted">Status</dt><dd><Pill tone={p.status === "active" ? "good" : "bad"}>{p.status}</Pill>{suspendedUntil && <span className="ml-1 text-xs text-muted">until {formatDate(suspendedUntil)}</span>}</dd></div>
          <div><dt className="text-muted">City</dt><dd className="font-semibold">{cityName}</dd></div>
          <div><dt className="text-muted">Phone</dt><dd className="font-semibold">{p.phone ?? "–"}</dd></div>
          <div><dt className="text-muted">Joined</dt><dd className="font-semibold">{formatDate(p.created_at)}</dd></div>
        </dl>
        <div className="mt-4 flex flex-wrap gap-2">
          {p.status === "active" ? (
            <>
              <ReasonAction label="Suspend" variant="secondary" description="The user is signed out and blocked until restored." fields={[{ name: "until", label: "Suspend until (optional)", type: "date" }]} action={(i) => setUserStatus(id, { status: "suspended", until: i.until || undefined, reason: i.reason })} />
              <ReasonAction label="Ban" variant="destructive" description="The account is closed. This stays until you restore it." action={(i) => setUserStatus(id, { status: "banned", reason: i.reason })} />
            </>
          ) : (
            <ReasonAction label="Restore" variant="primary" action={(i) => setUserStatus(id, { status: "active", reason: i.reason })} />
          )}
          <ReasonAction label="Change city" fields={[{ name: "cityId", label: "New city", type: "select", options: (cities.data ?? []).map((c) => ({ value: c.id, label: c.name })), required: true }]} action={(i) => changeUserCity(id, { cityId: i.cityId, reason: i.reason })} />
          <ReasonAction label="Send email" fields={[{ name: "subject", label: "Subject", required: true }, { name: "body", label: "Message", type: "textarea", required: true }]} action={(i) => sendUserEmail(id, { subject: i.subject, body: i.body, reason: i.reason })} />
        </div>
      </Panel>

      <div className="grid gap-4 md:grid-cols-2">
        <Panel title="Organized"><ul className="text-sm">{(org.data ?? []).map((t) => <li key={t.id}><Link className="text-primary hover:underline" href={`/admin/tournaments/${t.id}`}>{t.name}</Link> <Pill>{t.status}</Pill></li>)}{(org.data ?? []).length === 0 && <li className="text-muted">None</li>}</ul></Panel>
        <Panel title="Managed teams"><ul className="text-sm">{(mgr.data ?? []).map((t) => <li key={t.id}>{t.name} <Pill>{t.status}</Pill></li>)}{(mgr.data ?? []).length === 0 && <li className="text-muted">None</li>}</ul><p className="mt-2 text-xs text-muted">Squad memberships: {(squads.data ?? []).length}</p></Panel>
        <Panel title="Subscriptions"><ul className="text-sm">{(subs.data ?? []).map((s) => <li key={s.id}><Pill>{s.status}</Pill> {s.current_period_end ? `to ${formatDate(s.current_period_end)}` : ""}</li>)}{(subs.data ?? []).length === 0 && <li className="text-muted">None</li>}</ul></Panel>
        <Panel title="Organizer payments"><ul className="text-sm">{(tpay.data ?? []).map((x) => <li key={x.id}>{formatINR(x.total_paise)} <Pill tone={x.status === "paid" ? "good" : "neutral"}>{x.status}</Pill> {formatDate(x.paid_at ?? x.created_at)}</li>)}{(tpay.data ?? []).length === 0 && <li className="text-muted">None</li>}</ul></Panel>
      </div>

      <Panel title="Reports involving this user"><ul className="text-sm">{(reports.data ?? []).map((r) => <li key={r.id}><Pill>{r.status}</Pill> {r.target_type}: {r.reason} <span className="text-muted">({formatDate(r.created_at)})</span></li>)}{(reports.data ?? []).length === 0 && <li className="text-muted">None</li>}</ul></Panel>
      <Panel title="Audit trail">
        <DataTable caption="Audit trail" head={["When", "Action", "Reason"]}>
          {(audit.data ?? []).map((a) => <tr key={a.id}><td className={td}>{formatDateTime(a.created_at)}</td><td className={td}>{a.action}</td><td className={td}>{a.reason ?? "–"}</td></tr>)}
          {(audit.data ?? []).length === 0 && <tr><td colSpan={3} className="px-3 py-4 text-muted">No admin actions yet.</td></tr>}
        </DataTable>
      </Panel>
    </div>
  );
}
