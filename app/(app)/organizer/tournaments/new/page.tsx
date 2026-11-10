import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getProfile, getSessionUser } from "@/lib/session";
import { TournamentWizard } from "@/components/domain/organizer/wizard/wizard";
import { emptyDraft, fromRow, type SportOption } from "@/components/domain/organizer/wizard/types";

export const metadata: Metadata = { title: "Create a tournament" };

export default async function NewTournamentPage({ searchParams }: { searchParams: Promise<{ draft?: string }> }) {
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/organizer/tournaments/new");
  const profile = await getProfile();
  const { draft } = await searchParams;

  const supabase = await createClient();
  const [cities, sports, tiers] = await Promise.all([
    supabase.from("cities").select("id, name").eq("is_active", true).order("sort_order"),
    supabase.from("sports").select("id, slug, name, config").eq("is_active", true).order("name"),
    supabase.from("pricing_tiers").select("id, name, min_teams, max_teams, amount_paise").eq("is_active", true).order("sort_order"),
  ]);
  const sportList = (sports.data ?? []) as unknown as SportOption[];

  let initial = emptyDraft(sportList[0], profile?.city_id ?? cities.data?.[0]?.id ?? "");
  let initialId: string | null = null;
  if (draft && /^[0-9a-f-]{36}$/i.test(draft)) {
    const { data: t } = await supabase.from("tournaments").select("*").eq("id", draft).eq("organizer_id", user.id).eq("status", "draft").maybeSingle();
    if (t) {
      const { data: a } = await supabase.from("auction_settings").select("*").eq("tournament_id", t.id).maybeSingle();
      initial = fromRow(t, sportList.find((s) => s.id === t.sport_id), a);
      initialId = t.id;
    }
  }

  return (
    <TournamentWizard
      userId={user.id}
      sports={sportList}
      cities={cities.data ?? []}
      tiers={tiers.data ?? []}
      initial={initial}
      initialId={initialId}
    />
  );
}
