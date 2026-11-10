import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getProfile, getSessionUser } from "@/lib/session";
import { Button } from "@/components/ui/button";
import { ApplyTeamForm } from "@/components/domain/apply/apply-team-form";

export const metadata: Metadata = { title: "Apply with a team", robots: { index: false } };

export default async function ApplyTeamPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const user = await getSessionUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(`/tournaments/${slug}/apply-team`)}`);
  const profile = await getProfile();
  const supabase = await createClient();
  const { data: t } = await supabase.from("public_tournaments").select("id, name, slug, status, team_entry, team_deadline, squad_min, squad_max").eq("slug", slug).maybeSingle();
  if (!t || !t.id) notFound();

  const closed = t.status !== "registration_open" || t.team_entry === "invite" || (t.team_deadline && new Date() > new Date(t.team_deadline));
  const { data: mine } = await supabase.from("teams").select("id, status").eq("tournament_id", t.id).eq("manager_id", user.id).maybeSingle();

  return (
    <div className="mx-auto w-full max-w-2xl">
      <h1 className="font-display text-3xl font-bold">Apply with a team</h1>
      <p className="mb-5 mt-1 text-muted">{t.name}</p>
      {closed ? (
        <div role="alert" className="rounded-card border border-line bg-card p-6">
          <h2 className="font-display text-2xl font-bold">Team applications are closed</h2>
          <p className="mt-1 text-muted">{t.team_entry === "invite" ? "This tournament is invite only. Ask the organizer for an invite link." : "Registration is closed for this tournament."}</p>
          <Button asChild variant="secondary" className="mt-4"><Link href={`/tournaments/${t.slug}`}>Back to tournament</Link></Button>
        </div>
      ) : mine ? (
        <div role="status" className="rounded-card border border-line bg-card p-6">
          <h2 className="font-display text-2xl font-bold">You already have a team here</h2>
          <p className="mt-1 text-muted">Status: {mine.status}.</p>
          <Button asChild className="mt-4"><Link href={`/manager/teams/${mine.id}`}>Open team</Link></Button>
        </div>
      ) : (
        <ApplyTeamForm tournamentId={t.id} userId={user.id} defaultPhone={profile?.phone ?? ""} squadMin={t.squad_min} squadMax={t.squad_max} />
      )}
    </div>
  );
}
