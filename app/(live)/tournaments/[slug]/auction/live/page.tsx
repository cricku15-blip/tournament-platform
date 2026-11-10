import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSessionUser } from "@/lib/session";
import { LiveRoom } from "@/components/domain/auction/live-room";

export const metadata: Metadata = { title: "Live auction", robots: { index: false } };

export default async function LiveAuctionPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createClient();
  const { data: t } = await supabase.from("public_tournaments").select("id, name, slug, squad_mode, squad_max").eq("slug", slug).maybeSingle();
  if (!t || !t.id || t.squad_mode !== "auction") notFound();

  const user = await getSessionUser();
  let myTeam: { id: string; name: string } | null = null;
  let myPlayerId: string | null = null;
  if (user) {
    const [team, pool] = await Promise.all([
      supabase.from("teams").select("id, name").eq("tournament_id", t.id).eq("manager_id", user.id).eq("status", "approved").maybeSingle(),
      supabase.from("pool_players").select("user_id").eq("tournament_id", t.id).eq("user_id", user.id).maybeSingle(),
    ]);
    myTeam = team.data;
    myPlayerId = pool.data?.user_id ?? null;
  }
  const { count } = await supabase.from("teams").select("id", { count: "exact", head: true }).eq("tournament_id", t.id).eq("status", "approved");

  return <LiveRoom tournamentId={t.id} name={t.name ?? "Auction"} slug={t.slug ?? slug} squadMax={t.squad_max} myTeam={myTeam} myPlayerId={myPlayerId} managersTotal={count ?? 0} />;
}
