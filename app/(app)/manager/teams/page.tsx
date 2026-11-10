import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getSessionUser } from "@/lib/session";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { TeamLogo } from "@/components/ui/team-logo";
import { InviteCodeForm } from "@/components/domain/dashboard/invite-code-form";
import { formatDateTime } from "@/lib/format";

export const metadata: Metadata = { title: "My teams" };

export default async function ManagerTeamsPage() {
  const user = await getSessionUser();
  if (!user) return null;
  const supabase = await createClient();
  const { data } = await supabase.from("teams").select("id, name, logo_url, status, squad_locked, tournament_id, tournaments(name, slug, squad_min, squad_max, squad_mode, status)").eq("manager_id", user.id).order("created_at", { ascending: false }).limit(50);
  const teams = data ?? [];
  const ids = teams.map((t) => t.id);
  const tids = [...new Set(teams.map((t) => t.tournament_id))];
  const [sq, matches, auctions] = ids.length
    ? await Promise.all([
        supabase.from("squad_members").select("team_id").in("team_id", ids).limit(2000),
        supabase.from("matches").select("team_a_id, team_b_id, scheduled_at").in("tournament_id", tids).eq("fixture_published", true).is("result_published_at", null).gte("scheduled_at", new Date().toISOString()).order("scheduled_at").limit(300),
        supabase.from("auction_settings").select("tournament_id, status, scheduled_at").in("tournament_id", tids),
      ])
    : [{ data: [] }, { data: [] }, { data: [] }];
  const size = new Map<string, number>();
  for (const m of sq.data ?? []) size.set(m.team_id, (size.get(m.team_id) ?? 0) + 1);

  return (
    <div className="mx-auto w-full max-w-4xl">
      <h1 className="font-display text-3xl font-bold">My teams</h1>
      {teams.length === 0 ? (
        <div className="mt-6">
          <EmptyState title="You don't manage a team yet" description="Enter an invite code from an organizer, or apply with your team to an open tournament." action={<Button asChild variant="secondary"><Link href="/tournaments">Find tournaments</Link></Button>} />
          <InviteCodeForm />
        </div>
      ) : (
        <ul className="mt-5 grid gap-4 sm:grid-cols-2">
          {teams.map((t) => {
            const tour = t.tournaments as unknown as { name: string; slug: string; squad_min: number | null; squad_max: number | null; squad_mode: string; status: string } | null;
            const next = (matches.data ?? []).find((m) => m.team_a_id === t.id || m.team_b_id === t.id);
            const au = (auctions.data ?? []).find((a) => a.tournament_id === t.tournament_id);
            return (
              <li key={t.id} className="rounded-card border border-line bg-card p-4">
                <div className="flex items-center gap-3">
                  <TeamLogo src={t.logo_url} name={t.name} size="md" />
                  <div className="min-w-0">
                    <Link href={`/manager/teams/${t.id}`} className="block truncate font-display text-lg font-bold hover:text-primary">{t.name}</Link>
                    <p className="truncate text-sm text-muted">{tour?.name}</p>
                  </div>
                  <Badge className="ml-auto" variant={t.status === "approved" ? "open" : t.status === "rejected" ? "cancelled" : "neutral"}>{t.status}</Badge>
                </div>
                <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
                  <div><dt className="text-muted">Squad</dt><dd className="font-semibold">{size.get(t.id) ?? 0} of {tour?.squad_max ?? "–"} (min {tour?.squad_min ?? "–"})</dd></div>
                  <div><dt className="text-muted">Next fixture</dt><dd className="font-semibold">{next?.scheduled_at ? formatDateTime(next.scheduled_at) : "None yet"}</dd></div>
                  {tour?.squad_mode === "auction" && <div className="col-span-2"><dt className="text-muted">Auction</dt><dd className="font-semibold">{au?.status === "completed" ? "Completed" : au?.scheduled_at ? `Scheduled ${formatDateTime(au.scheduled_at)}` : "Not scheduled"}</dd></div>}
                </dl>
                <Button asChild size="sm" className="mt-3"><Link href={`/manager/teams/${t.id}`}>Open team</Link></Button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
