import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireOwnedTournament } from "@/lib/organizer/guard";
import { getProfile, getSessionUser } from "@/lib/session";
import { CheckoutPanel } from "@/components/domain/payments/checkout-panel";

export const metadata: Metadata = { title: "Checkout" };

export default async function CheckoutPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ upgrade?: string }> }) {
  const { id } = await params;
  const { tournament: t } = await requireOwnedTournament(id);
  const upgrade = Number(((await searchParams).upgrade ?? "")) || null;
  const isUpgrade = Boolean(upgrade && upgrade > t.team_count && ["paid", "registration_open", "registration_closed"].includes(t.status));
  if (t.status !== "draft" && !isUpgrade) redirect(`/organizer/tournaments/${t.id}`);

  const [user, profile] = [await getSessionUser(), await getProfile()];
  const supabase = await createClient();
  const [sport, city] = await Promise.all([
    supabase.from("sports").select("name").eq("id", t.sport_id).maybeSingle(),
    supabase.from("cities").select("name").eq("id", t.city_id).maybeSingle(),
  ]);

  return (
    <CheckoutPanel
      tournamentId={t.id}
      name={t.name}
      sport={sport.data?.name ?? ""}
      city={city.data?.name ?? ""}
      targetTeams={isUpgrade ? upgrade : null}
      prefill={{ name: profile?.full_name ?? undefined, email: user?.email ?? undefined }}
    />
  );
}
