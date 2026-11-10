import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getProfile, getSessionUser } from "@/lib/session";
import { Button } from "@/components/ui/button";
import { ApplyPlayerForm, type ProfileField } from "@/components/domain/apply/apply-player-form";
import { SwitchCityButton } from "@/components/domain/apply/switch-city-button";
import { formatDate } from "@/lib/format";
import { REASON_COPY } from "@/lib/payments/eligibility";

export const metadata: Metadata = { title: "Apply as a player", robots: { index: false } };

function Blocked({ title, text, children }: { title: string; text: string; children?: React.ReactNode }) {
  return (
    <div role="alert" className="rounded-card border border-line bg-card p-6">
      <h2 className="font-display text-2xl font-bold">{title}</h2>
      <p className="mt-1 text-muted">{text}</p>
      {children && <div className="mt-4 flex flex-wrap gap-2">{children}</div>}
    </div>
  );
}

export default async function ApplyPlayerPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const user = await getSessionUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(`/tournaments/${slug}/apply-player`)}`);
  const profile = await getProfile();
  const supabase = await createClient();

  const { data: t } = await supabase
    .from("public_tournaments")
    .select("id, name, slug, sport_id, sport_slug, city_id, city_name, status, allow_player_applications, player_deadline, squad_mode, start_date, end_date, custom_questions")
    .eq("slug", slug)
    .maybeSingle();
  if (!t || !t.id) notFound();

  const [sub, existing, pool, sport, psp, auction] = await Promise.all([
    supabase.rpc("has_active_subscription", { uid: user.id }),
    supabase.from("player_applications").select("status").eq("tournament_id", t.id).eq("user_id", user.id).maybeSingle(),
    t.id ? supabase.from("tournaments").select("player_pool_cap").eq("id", t.id).maybeSingle() : Promise.resolve({ data: null }),
    supabase.from("sports").select("config").eq("id", t.sport_id ?? "").maybeSingle(),
    supabase.from("player_sport_profiles").select("details").eq("user_id", user.id).eq("sport_id", t.sport_id ?? "").maybeSingle(),
    supabase.from("auction_settings").select("scheduled_at").eq("tournament_id", t.id).maybeSingle(),
  ]);

  const summary = (
    <aside className="rounded-card border border-line bg-card p-5 lg:sticky lg:top-24 lg:self-start" aria-label="Tournament summary">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted">Applying to</p>
      <h2 className="font-display text-xl font-bold">{t.name}</h2>
      <dl className="mt-3 flex flex-col gap-2 text-sm">
        <div><dt className="text-muted">City</dt><dd className="font-semibold">{t.city_name}</dd></div>
        {t.start_date && <div><dt className="text-muted">Dates</dt><dd className="font-semibold">{formatDate(t.start_date)}{t.end_date ? ` to ${formatDate(t.end_date)}` : ""}</dd></div>}
        <div><dt className="text-muted">Squads</dt><dd className="font-semibold">{t.squad_mode === "auction" ? "Auction" : "Direct"}</dd></div>
        {t.squad_mode === "auction" && auction.data?.scheduled_at && <div><dt className="text-muted">Auction</dt><dd className="font-semibold">{formatDate(auction.data.scheduled_at)}</dd></div>}
      </dl>
    </aside>
  );

  // Entry checks, in the order of the spec. The database enforces every one of these again on submit.
  let blocked: React.ReactNode = null;
  if (t.status !== "registration_open" || !t.allow_player_applications || (t.player_deadline && new Date() > new Date(t.player_deadline))) {
    blocked = <Blocked title="Registration is closed" text={REASON_COPY.registration_closed}><Button asChild variant="secondary"><Link href={`/tournaments/${t.slug}`}>Back to tournament</Link></Button></Blocked>;
  } else if (pool.data?.player_pool_cap) {
    const { count } = await supabase.from("player_applications").select("id", { count: "exact", head: true }).eq("tournament_id", t.id).in("status", ["pending", "approved"]);
    if ((count ?? 0) >= pool.data.player_pool_cap) blocked = <Blocked title="This tournament is full" text="The player pool has reached its maximum size." />;
  }
  if (!blocked && profile?.city_id !== t.city_id) {
    blocked = (
      <Blocked title="Different city" text={REASON_COPY.city_mismatch}>
        {t.city_id && <SwitchCityButton cityId={t.city_id} cityName={t.city_name ?? "this city"} />}
      </Blocked>
    );
  }
  if (!blocked && sub.data !== true) {
    blocked = <Blocked title="Subscription needed" text={REASON_COPY.subscription_required}><Button asChild><Link href="/subscription">Start subscription</Link></Button></Blocked>;
  }
  if (!blocked && existing.data && existing.data.status !== "withdrawn") {
    blocked = <Blocked title="You've already applied" text={`Your application status is ${existing.data.status}.`}><Button asChild variant="secondary"><Link href="/player/applications">See my applications</Link></Button></Blocked>;
  }

  const cfg = (sport.data?.config ?? {}) as { roles?: string[]; profile_fields?: ProfileField[] };
  const saved = (psp.data?.details ?? {}) as Record<string, unknown>;
  const defaults = {
    role: typeof saved.role === "string" ? saved.role : "",
    phone: profile?.phone ?? "",
    details: Object.fromEntries(Object.entries(saved).map(([k, v]) => [k, String(v ?? "")])),
  };
  const needsProfile = !blocked && (cfg.profile_fields ?? []).length > 0 && !psp.data;

  return (
    <div className="mx-auto grid w-full max-w-5xl gap-6 lg:grid-cols-[1fr_300px]">
      <div>
        <h1 className="mb-4 font-display text-3xl font-bold">Apply as a player</h1>
        {blocked ?? (
          <>
            {needsProfile && (
              <p className="mb-4 rounded-input border border-line bg-surface p-3 text-sm">
                Add your playing details once in your <Link href="/profile" className="font-semibold text-primary underline">profile</Link> and they&apos;ll be filled in for every application.
              </p>
            )}
            <ApplyPlayerForm
              tournamentId={t.id}
              roles={cfg.roles ?? []}
              fields={cfg.profile_fields ?? []}
              questions={((Array.isArray(t.custom_questions) ? t.custom_questions : []) as Array<{ q: string; required: boolean }>).filter((q) => q?.q)}
              defaults={defaults}
            />
          </>
        )}
      </div>
      {summary}
    </div>
  );
}
