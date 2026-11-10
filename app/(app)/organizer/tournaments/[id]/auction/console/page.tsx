import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireOwnedTournament } from "@/lib/organizer/guard";
import { AuctionConsole } from "@/components/domain/auction/console";

export const metadata: Metadata = { title: "Auction console" };

export default async function ConsolePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { tournament: t } = await requireOwnedTournament(id);
  if (t.squad_mode !== "auction") notFound();
  const supabase = await createClient();
  const { data: teams } = await supabase.from("teams").select("id, name, manager_id").eq("tournament_id", t.id).eq("status", "approved").order("name").limit(64);
  return <AuctionConsole tournamentId={t.id} name={t.name} squadMax={t.squad_max} teams={(teams ?? []).map((x) => ({ id: x.id, name: x.name, hasManager: Boolean(x.manager_id) }))} />;
}
