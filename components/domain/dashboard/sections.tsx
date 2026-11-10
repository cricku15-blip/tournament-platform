import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { StatTile } from "@/components/ui/stat-tile";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/format";
import { InviteCodeForm } from "./invite-code-form";

function SectionCard({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="rounded-card border border-line bg-card p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="font-display text-xl font-bold text-ink">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

export async function SubscriptionCard({ userId }: { userId: string }) {
  const supabase = await createClient();
  const { data: sub } = await supabase
    .from("subscriptions")
    .select("status, current_period_end, grace_until")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const active = Boolean(
    sub &&
      (sub.status === "active" ||
        (sub.status === "cancelled" && sub.current_period_end && new Date(sub.current_period_end) > new Date()))
  );
  const pastDue = sub?.status === "past_due";
  return (
    <SectionCard
      title="Player subscription"
      action={
        <Button asChild size="sm" variant={active ? "secondary" : "primary"}>
          <Link href="/subscription">{active ? "Manage" : "Subscribe"}</Link>
        </Button>
      }
    >
      {active ? (
        <p className="text-sm text-muted">
          <Badge variant="open">Active</Badge>{" "}
          {sub?.current_period_end ? `Renews ${formatDate(sub.current_period_end)}` : null}
        </p>
      ) : pastDue ? (
        <p className="text-sm text-muted">
          <Badge variant="cancelled">Payment failed</Badge> Update your payment
          {sub?.grace_until ? ` before ${formatDate(sub.grace_until)}` : ""} to keep applying.
        </p>
      ) : (
        <p className="text-sm text-muted">Subscribe to apply to tournaments in your city.</p>
      )}
    </SectionCard>
  );
}

export async function OpenInYourCity({ cityId }: { cityId: string | null }) {
  if (!cityId) return null;
  const supabase = await createClient();
  const { data } = await supabase
    .from("public_tournaments")
    .select("id, name, slug, sport_name, start_date")
    .eq("status", "registration_open")
    .eq("city_id", cityId)
    .order("start_date", { ascending: true })
    .limit(6);

  return (
    <SectionCard
      title="Open in your city"
      action={
        <Link href="/tournaments" className="text-sm font-semibold text-primary hover:underline">
          Browse all
        </Link>
      }
    >
      {!data || data.length === 0 ? (
        <EmptyState description="No tournaments are taking registrations in your city right now." />
      ) : (
        <ul className="divide-y divide-line">
          {data.map((t) => (
            <li key={t.id} className="flex min-h-11 items-center justify-between gap-3 py-3">
              <div className="min-w-0">
                <p className="truncate font-semibold text-ink">{t.name}</p>
                <p className="text-xs text-muted">
                  {t.sport_name}
                  {t.start_date ? ` · starts ${formatDate(t.start_date)}` : ""}
                </p>
              </div>
              <Button asChild size="sm" variant="secondary">
                <Link href={`/tournaments/${t.slug}`}>Apply</Link>
              </Button>
            </li>
          ))}
        </ul>
      )}
    </SectionCard>
  );
}

export async function ApplicationCounts({ userId }: { userId: string }) {
  const supabase = await createClient();
  const { data } = await supabase.from("player_applications").select("status").eq("user_id", userId).limit(200);
  const counts = { pending: 0, approved: 0, rejected: 0 };
  for (const a of data ?? []) {
    if (a.status === "pending" || a.status === "approved" || a.status === "rejected") counts[a.status]++;
  }
  return (
    <SectionCard title="My applications">
      <div className="grid grid-cols-3 gap-3">
        <StatTile label="Pending" value={counts.pending} />
        <StatTile label="Approved" value={counts.approved} />
        <StatTile label="Rejected" value={counts.rejected} />
      </div>
    </SectionCard>
  );
}

export function UpcomingMatchesPlaceholder() {
  return (
    <SectionCard title="Upcoming matches">
      <EmptyState description="Your fixtures will show up here once your team is in a live tournament." />
    </SectionCard>
  );
}

export async function ManagerTeams({ userId }: { userId: string }) {
  const supabase = await createClient();
  const { data: teams } = await supabase
    .from("teams")
    .select("id, name, status, tournaments(name, squad_min)")
    .eq("manager_id", userId)
    .order("created_at", { ascending: false })
    .limit(12);

  const ids = (teams ?? []).map((t) => t.id);
  const sizes = new Map<string, number>();
  if (ids.length) {
    const { data: members } = await supabase.from("squad_members").select("team_id").in("team_id", ids);
    for (const m of members ?? []) sizes.set(m.team_id, (sizes.get(m.team_id) ?? 0) + 1);
  }

  return (
    <SectionCard title="My teams">
      {!teams || teams.length === 0 ? (
        <EmptyState description="You don't manage a team yet. Join one with an invite code or apply to a tournament." />
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {teams.map((t) => {
            const tour = t.tournaments as unknown as { name: string; squad_min: number | null } | null;
            const size = sizes.get(t.id) ?? 0;
            return (
              <li key={t.id} className="rounded-input border border-line p-4">
                <p className="font-semibold text-ink">{t.name}</p>
                <p className="text-xs text-muted">{tour?.name}</p>
                <p className="mt-2 text-sm text-muted">
                  Squad {size}
                  {tour?.squad_min ? ` / min ${tour.squad_min}` : ""}
                </p>
                <p className="text-xs text-muted">Next fixture: coming soon</p>
              </li>
            );
          })}
        </ul>
      )}
    </SectionCard>
  );
}

export async function OrganizerOverview({ userId }: { userId: string }) {
  const supabase = await createClient();
  const [{ data: tournaments }, pending] = await Promise.all([
    supabase.from("tournaments").select("id, name, status").eq("organizer_id", userId).limit(100),
    supabase
      .from("player_applications")
      .select("id, tournaments!inner(organizer_id)", { count: "exact", head: true })
      .eq("status", "pending")
      .eq("tournaments.organizer_id", userId),
  ]);

  const list = tournaments ?? [];
  const live = list.filter((t) => t.status === "live").length;
  const open = list.filter((t) => t.status === "registration_open").length;
  const drafts = list.filter((t) => t.status === "draft");
  const pendingCount = pending.count ?? 0;

  const attention: { key: string; text: string; href: string }[] = [
    ...drafts.map((t) => ({
      key: `d${t.id}`,
      text: `${t.name} is unpublished. Pay the fee to publish it.`,
      href: `/organizer/tournaments/${t.id}`,
    })),
    ...(pendingCount > 0
      ? [
          {
            key: "pending",
            text: `${pendingCount} player application${pendingCount === 1 ? "" : "s"} waiting for review.`,
            href: "/organizer",
          },
        ]
      : []),
  ];

  return (
    <SectionCard
      title="Organizer"
      action={
        <Button asChild size="sm">
          <Link href="/organizer/tournaments/new">Create tournament</Link>
        </Button>
      }
    >
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile label="Tournaments" value={list.length} />
        <StatTile label="Registration open" value={open} />
        <StatTile label="Live" value={live} />
        <StatTile label="Pending applications" value={pendingCount} />
      </div>
      <h3 className="mt-5 text-sm font-semibold text-ink">Needs your attention</h3>
      {attention.length === 0 ? (
        <p className="mt-2 text-sm text-muted">You&apos;re all caught up.</p>
      ) : (
        <ul className="mt-2 divide-y divide-line">
          {attention.map((a) => (
            <li key={a.key}>
              <Link href={a.href} className="block min-h-11 py-3 text-sm text-ink hover:text-primary">
                {a.text}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </SectionCard>
  );
}

export function NewUserEmptyState() {
  return (
    <section className="rounded-card border border-line bg-card p-6 text-center">
      <h2 className="font-display text-2xl font-bold text-ink">Let&apos;s get you started</h2>
      <div className="mt-4 flex flex-wrap justify-center gap-3">
        <Button asChild>
          <Link href="/tournaments">Find a tournament</Link>
        </Button>
        <Button asChild variant="secondary">
          <Link href="/organizer/tournaments/new">Create a tournament</Link>
        </Button>
      </div>
      <InviteCodeForm />
    </section>
  );
}
