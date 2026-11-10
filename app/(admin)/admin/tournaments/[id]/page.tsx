import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/admin/guard";
import { createAdminClient } from "@/lib/supabase/admin";
import { DataTable, PageHead, Panel, Pill, td } from "@/components/domain/admin/ui";
import { ReasonAction } from "@/components/domain/admin/reason-action";
import { addTournamentNote, cancelTournamentAdmin, forceTournamentStatus, markForRefund, reassignOrganizer, setTournamentHidden } from "../../actions";
import { formatDate, formatDateTime, formatINR } from "@/lib/format";
import { STATUS_LABEL } from "@/lib/public/labels";

export const metadata: Metadata = { title: "Tournament | Admin", robots: { index: false } };
const STATUSES = ["draft", "paid", "registration_open", "registration_closed", "auction", "squads_locked", "live", "completed", "cancelled"];

export default async function AdminTournament({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const db = createAdminClient();
  const { data: t } = await db.from("tournaments").select("*").eq("id", id).maybeSingle();
  if (!t) notFound();
  const [org, pays, chat, teams] = await Promise.all([
    db.from("profiles").select("id, full_name, username").eq("id", t.organizer_id).maybeSingle(),
    db.from("tournament_payments").select("id, kind, total_paise, status, razorpay_payment_id, paid_at, created_at").eq("tournament_id", id).order("created_at", { ascending: false }).limit(10),
    db.from("chat_messages").select("id, user_id, body, created_at, is_deleted").eq("tournament_id", id).order("created_at", { ascending: false }).limit(20),
    db.from("teams").select("id, name, status").eq("tournament_id", id).limit(40),
  ]);
  const notes = (t as { admin_notes?: string | null }).admin_notes;
  const hidden = (t as { admin_hidden?: boolean }).admin_hidden;

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-4">
      <PageHead title={t.name} subtitle={`${t.slug} · ${STATUS_LABEL[t.status] ?? t.status}${hidden ? " · hidden by admin" : ""}`} actions={<span className="flex gap-3 text-sm"><Link className="font-semibold text-primary hover:underline" href={`/tournaments/${t.slug}`} target="_blank">Public page</Link><Link className="font-semibold text-primary hover:underline" href="/admin/tournaments">All</Link></span>} />
      <Panel title="Actions">
        <div className="flex flex-wrap gap-2">
          {t.visibility === "public" ? (
            <ReasonAction label="Hide" description="Removes it from browse and search. The link still works." action={(i) => setTournamentHidden(id, { hide: "yes", reason: i.reason })} />
          ) : (
            <ReasonAction label="Restore visibility" action={(i) => setTournamentHidden(id, { hide: "no", reason: i.reason })} />
          )}
          {!["cancelled", "completed"].includes(t.status) && <ReasonAction label="Cancel tournament" variant="destructive" description="Everyone involved is notified with this reason." action={(i) => cancelTournamentAdmin(id, { reason: i.reason })} />}
          <ReasonAction label="Force status" description="Skips the normal rules. Use only to repair a stuck tournament." fields={[{ name: "status", label: "New status", type: "select", options: STATUSES.map((s) => ({ value: s, label: STATUS_LABEL[s] ?? s })), defaultValue: t.status }]} action={(i) => forceTournamentStatus(id, { status: i.status, reason: i.reason })} />
          <ReasonAction label="Reassign organizer" fields={[{ name: "username", label: "New organizer's username", required: true }]} action={(i) => reassignOrganizer(id, { username: i.username, reason: i.reason })} />
        </div>
        <p className="mt-3 text-sm text-muted">Organizer: {org.data ? <Link className="text-primary hover:underline" href={`/admin/users/${org.data.id}`}>{org.data.full_name} (@{org.data.username})</Link> : "–"}</p>
      </Panel>

      <Panel title="Internal notes">
        <pre className="whitespace-pre-wrap text-sm">{notes || "No notes yet."}</pre>
        <div className="mt-3"><ReasonAction label="Add note" reasonRequired={false} reasonLabel="Why (optional)" fields={[{ name: "note", label: "Note", type: "textarea", required: true }]} action={(i) => addTournamentNote(id, { note: i.note, reason: i.reason || "Internal note" })} /></div>
      </Panel>

      <Panel title="Payments">
        <DataTable caption="Tournament payments" head={["When", "Kind", "Amount", "Status", "Razorpay payment", ""]}>
          {(pays.data ?? []).map((p) => (
            <tr key={p.id}>
              <td className={td}>{formatDate(p.paid_at ?? p.created_at)}</td><td className={td}>{p.kind}</td><td className={td}>{formatINR(p.total_paise)}</td>
              <td className={td}><Pill tone={p.status === "paid" ? "good" : p.status === "failed" ? "bad" : "neutral"}>{p.status}</Pill></td>
              <td className={td}>{p.razorpay_payment_id ?? "–"}</td>
              <td className={td}>{p.status === "paid" && <ReasonAction label="Mark for refund" action={(i) => markForRefund("tournament", p.id, { reason: i.reason })} />}</td>
            </tr>
          ))}
          {(pays.data ?? []).length === 0 && <tr><td colSpan={6} className="px-3 py-4 text-muted">No payments.</td></tr>}
        </DataTable>
      </Panel>

      <div className="grid gap-4 md:grid-cols-2">
        <Panel title="Teams"><ul className="text-sm">{(teams.data ?? []).map((x) => <li key={x.id}>{x.name} <Pill>{x.status}</Pill></li>)}{(teams.data ?? []).length === 0 && <li className="text-muted">None</li>}</ul></Panel>
        <Panel title="Recent chat (read only)"><ul className="flex max-h-72 flex-col gap-1 overflow-y-auto text-sm">{(chat.data ?? []).map((m) => <li key={m.id}><span className="text-xs text-muted">{formatDateTime(m.created_at)}</span> {m.is_deleted ? <em className="text-muted">removed</em> : m.body}</li>)}{(chat.data ?? []).length === 0 && <li className="text-muted">No messages.</li>}</ul></Panel>
      </div>
    </div>
  );
}
