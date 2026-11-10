import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";
import type { AuctionStatus, BidItem, Lot, PurseInfo, Snapshot } from "./auction-reducer";

/** Reads the whole auction state from the database. Used on connect, reconnect, focus and every 20 s. */
export async function fetchSnapshot(supabase: SupabaseClient<Database>, tournamentId: string): Promise<Snapshot> {
  const [settings, lotRow, purses, teams, squads, lots] = await Promise.all([
    supabase.from("auction_settings").select("status").eq("tournament_id", tournamentId).maybeSingle(),
    supabase.from("auction_lots").select("id, player_id, bidding_open, current_bid, current_team_id").eq("tournament_id", tournamentId).eq("status", "on_block").maybeSingle(),
    supabase.from("team_purses").select("team_id, total, spent").eq("tournament_id", tournamentId).limit(64),
    supabase.from("public_teams").select("id, name").eq("tournament_id", tournamentId).limit(64),
    supabase.from("squad_members").select("team_id").eq("tournament_id", tournamentId).limit(1000),
    supabase.from("auction_lots").select("status").eq("tournament_id", tournamentId).limit(2000),
  ]);

  const nameOf = new Map((teams.data ?? []).map((t) => [t.id, t.name ?? "Team"]));
  const squadCount = new Map<string, number>();
  for (const s of squads.data ?? []) squadCount.set(s.team_id, (squadCount.get(s.team_id) ?? 0) + 1);
  const purseMap: Record<string, PurseInfo> = {};
  for (const p of purses.data ?? []) purseMap[p.team_id] = { name: nameOf.get(p.team_id) ?? "Team", total: p.total, spent: p.spent, squad: squadCount.get(p.team_id) ?? 0 };

  const counts = { upcoming: 0, sold: 0, unsold: 0 };
  for (const l of lots.data ?? []) {
    if (l.status === "upcoming") counts.upcoming++;
    else if (l.status === "sold") counts.sold++;
    else if (l.status === "unsold") counts.unsold++;
  }

  let lot: Lot | null = null;
  let bids: BidItem[] = [];
  if (lotRow.data) {
    const l = lotRow.data;
    const [pool, profile, next, bidRows] = await Promise.all([
      supabase.from("pool_players").select("category, base_price").eq("tournament_id", tournamentId).eq("user_id", l.player_id).maybeSingle(),
      supabase.from("public_profiles").select("full_name").eq("id", l.player_id).maybeSingle(),
      supabase.rpc("next_bid_amount", { p_lot_id: l.id }),
      supabase.from("bids").select("id, team_id, amount").eq("lot_id", l.id).eq("is_undone", false).order("placed_at", { ascending: false }).order("id", { ascending: false }).limit(8),
    ]);
    lot = {
      id: l.id, playerId: l.player_id, playerName: profile.data?.full_name ?? "Player", category: pool.data?.category ?? null, basePrice: pool.data?.base_price ?? 0,
      biddingOpen: l.bidding_open, currentBid: l.current_bid, currentTeamId: l.current_team_id, currentTeamName: l.current_team_id ? nameOf.get(l.current_team_id) ?? null : null,
      nextBid: typeof next.data === "number" ? next.data : Math.max(pool.data?.base_price ?? 1, 1),
    };
    bids = (bidRows.data ?? []).map((b) => ({ id: b.id, teamId: b.team_id, teamName: nameOf.get(b.team_id) ?? "Team", amount: b.amount }));
  }

  return { status: (settings.data?.status ?? "not_scheduled") as AuctionStatus, lot, purses: purseMap, bids, counts };
}
