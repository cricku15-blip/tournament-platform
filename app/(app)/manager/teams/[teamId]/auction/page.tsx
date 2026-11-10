import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireTeamAccess } from "@/lib/team/guard";
import { PrepHub, type PoolItem } from "@/components/domain/auction/prep-hub";

export const metadata: Metadata = { title: "Auction prep" };

export default async function AuctionPrepPage({ params }: { params: Promise<{ teamId: string }> }) {
  const { teamId } = await params;
  const { team, tournament: t } = await requireTeamAccess(teamId);
  if (t.squad_mode !== "auction") notFound();
  const supabase = await createClient();
  const [settings, purse, pool, squad] = await Promise.all([
    supabase.from("auction_settings").select("status, scheduled_at, categories, category_limits").eq("tournament_id", t.id).maybeSingle(),
    supabase.from("team_purses").select("total, spent").eq("team_id", team.id).maybeSingle(),
    supabase.from("pool_players").select("user_id, category, base_price, lot_status, sequence_no").eq("tournament_id", t.id).order("sequence_no", { ascending: true, nullsFirst: false }).limit(500),
    supabase.from("squad_members").select("user_id, price").eq("team_id", team.id).limit(40),
  ]);
  const poolRows = pool.data ?? [];
  const ids = [...new Set([...poolRows.map((p) => p.user_id), ...(squad.data ?? []).map((s) => s.user_id)])];
  const names = new Map<string, string>();
  for (let i = 0; i < ids.length; i += 100) {
    const { data } = await supabase.from("public_profiles").select("id, full_name").in("id", ids.slice(i, i + 100));
    for (const p of data ?? []) if (p.id) names.set(p.id, p.full_name ?? "Player");
  }
  const catOf = new Map(poolRows.map((p) => [p.user_id, p.category]));
  const owned: Record<string, number> = {};
  for (const s of squad.data ?? []) {
    const c = catOf.get(s.user_id);
    if (c) owned[c] = (owned[c] ?? 0) + 1;
  }
  const minBase = poolRows.length ? Math.min(...poolRows.map((p) => p.base_price)) : 0;
  const have = (squad.data ?? []).length;
  const reserveNeeded = purse.data ? minBase * Math.max((t.squad_min ?? 0) - have - 1, 0) : null;
  const items: PoolItem[] = poolRows.filter((p) => p.lot_status !== "sold").map((p) => ({ id: p.user_id, name: names.get(p.user_id) ?? "Player", category: p.category, base: p.base_price, status: p.lot_status }));
  const categories = ((settings.data?.categories as string[]) ?? []).length ? (settings.data?.categories as string[]) : [...new Set(poolRows.map((p) => p.category).filter((c): c is string => !!c))];

  return (
    <div className="mx-auto w-full max-w-4xl">
      <h1 className="mb-4 font-display text-3xl font-bold">Auction prep</h1>
      <PrepHub
        tournamentId={t.id} slug={t.slug} teamName={team.name} purse={purse.data} reserveNeeded={reserveNeeded} squadMin={t.squad_min} squadMax={t.squad_max}
        limits={(settings.data?.category_limits as Record<string, number>) ?? {}} categories={categories} scheduledAt={settings.data?.scheduled_at ?? null} auctionStatus={settings.data?.status ?? "not_scheduled"}
        pool={items} owned={owned}
        bought={(squad.data ?? []).map((s) => ({ name: names.get(s.user_id) ?? "Player", price: s.price, category: catOf.get(s.user_id) ?? null }))}
      />
    </div>
  );
}
