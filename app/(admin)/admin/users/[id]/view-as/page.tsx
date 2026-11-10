import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/admin/guard";
import { writeAudit } from "@/lib/admin/audit";
import { createAdminClient } from "@/lib/supabase/admin";
import { PageHead, Panel, Pill } from "@/components/domain/admin/ui";
import { Button } from "@/components/ui/button";
import { formatDateTime } from "@/lib/format";

export const metadata: Metadata = { title: "View as user | Admin", robots: { index: false } };
export const dynamic = "force-dynamic";

/**
 * Read-only "view as": shows what the user sees in their workspace. No session is swapped and nothing here can write.
 * Every view is written to the audit log with a mandatory reason.
 */
export default async function ViewAs({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ reason?: string }> }) {
  const admin = await requireAdmin();
  const { id } = await params;
  const { reason: rawReason } = await searchParams;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const db = createAdminClient();
  const { data: p } = await db.from("profiles").select("id, full_name, username, status, city_id, created_at").eq("id", id).maybeSingle();
  if (!p) notFound();

  const reason = (rawReason ?? "").trim();
  if (reason.length < 5) {
    return (
      <div className="mx-auto flex max-w-xl flex-col gap-4">
        <PageHead title={`View as ${p.full_name ?? "user"}`} subtitle="Read-only. You can see what they see but change nothing." />
        <Panel>
          <form method="get" className="flex flex-col gap-3">
            <label className="text-sm font-semibold" htmlFor="why">Why do you need to look? (5 or more characters, saved in the audit log)</label>
            <input id="why" name="reason" required minLength={5} maxLength={300} className="min-h-11 rounded-input border border-line bg-card px-3" />
            <Button type="submit">Start read-only view</Button>
          </form>
        </Panel>
      </div>
    );
  }

  await writeAudit({ actorId: admin.userId, action: "impersonation_view", targetType: "user", targetId: id, reason: reason.slice(0, 300) });

  const [asOrg, asAsst, teams, apps, squads, notes, sub] = await Promise.all([
    db.from("tournaments").select("id, name, status").eq("organizer_id", id).order("created_at", { ascending: false }).limit(20),
    db.from("tournament_assistants").select("tournament_id, tournaments(name, status)").eq("user_id", id).limit(20),
    db.from("teams").select("id, name, status, tournaments(name)").eq("manager_id", id).limit(20),
    db.from("player_applications").select("id, status, tournaments(name)").eq("user_id", id).order("created_at", { ascending: false }).limit(20),
    db.from("squad_members").select("team_id, teams(name, tournaments(name))").eq("user_id", id).limit(20),
    db.from("notifications").select("id, title, body, read_at, created_at").eq("user_id", id).order("created_at", { ascending: false }).limit(10),
    db.from("subscriptions").select("status, current_period_end").eq("user_id", id).order("created_at", { ascending: false }).limit(1),
  ]);

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-4">
      <div role="status" className="rounded-card border border-floodlight bg-floodlight/10 p-3 text-sm font-semibold">
        Read-only view of {p.full_name ?? "this user"} (@{p.username ?? "no username"}). This view is recorded in the audit log.
      </div>
      <PageHead title={`${p.full_name ?? "User"}'s workspace`} actions={<Link href={`/admin/users/${id}`} className="text-sm font-semibold text-primary hover:underline">Back to user</Link>} />
      <div className="grid gap-4 md:grid-cols-2">
        <Panel title="Organizes"><ul className="text-sm">{(asOrg.data ?? []).map((t) => <li key={t.id}>{t.name} <Pill>{t.status}</Pill></li>)}{(asOrg.data ?? []).length === 0 && <li className="text-muted">None</li>}</ul></Panel>
        <Panel title="Assists"><ul className="text-sm">{(asAsst.data ?? []).map((a) => { const t = a.tournaments as unknown as { name: string; status: string } | null; return <li key={a.tournament_id}>{t?.name ?? "Tournament"} <Pill>{t?.status ?? ""}</Pill></li>; })}{(asAsst.data ?? []).length === 0 && <li className="text-muted">None</li>}</ul></Panel>
        <Panel title="Manages teams"><ul className="text-sm">{(teams.data ?? []).map((t) => <li key={t.id}>{t.name} <Pill>{t.status}</Pill> <span className="text-muted">{(t.tournaments as unknown as { name: string } | null)?.name}</span></li>)}{(teams.data ?? []).length === 0 && <li className="text-muted">None</li>}</ul></Panel>
        <Panel title="Player applications"><ul className="text-sm">{(apps.data ?? []).map((a) => <li key={a.id}>{(a.tournaments as unknown as { name: string } | null)?.name} <Pill>{a.status}</Pill></li>)}{(apps.data ?? []).length === 0 && <li className="text-muted">None</li>}</ul></Panel>
        <Panel title="In squads"><ul className="text-sm">{(squads.data ?? []).map((s) => { const t = s.teams as unknown as { name: string; tournaments: { name: string } | null } | null; return <li key={s.team_id}>{t?.name} <span className="text-muted">{t?.tournaments?.name}</span></li>; })}{(squads.data ?? []).length === 0 && <li className="text-muted">None</li>}</ul></Panel>
        <Panel title="Subscription"><p className="text-sm">{sub.data?.[0] ? <>{sub.data[0].status} until {sub.data[0].current_period_end ? formatDateTime(sub.data[0].current_period_end) : "n/a"}</> : <span className="text-muted">None</span>}</p></Panel>
      </div>
      <Panel title="Latest notifications">
        <ul className="flex flex-col gap-2 text-sm">
          {(notes.data ?? []).map((n) => <li key={n.id} className="rounded-input bg-surface p-2"><strong>{n.title}</strong>{!n.read_at && <Pill>unread</Pill>}<div className="text-muted">{n.body}</div></li>)}
          {(notes.data ?? []).length === 0 && <li className="text-muted">None</li>}
        </ul>
      </Panel>
    </div>
  );
}
