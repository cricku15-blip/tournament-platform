"use client";

import * as React from "react";
import { createClient } from "@/lib/supabase/browser";

export interface LotListItem {
  id: string;
  name: string;
  category: string | null;
  basePrice: number;
  price?: number | null;
  team?: string | null;
  status?: string;
  sequence?: number | null;
}

/** Sold and upcoming lists for the room tabs. Fetched only when a tab is open and refetched when counts change. */
export function useLotLists(tournamentId: string, tab: "teams" | "sold" | "upcoming" | "all", version: string) {
  const [items, setItems] = React.useState<LotListItem[]>([]);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    if (tab === "teams") return;
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- loading flag for an async fetch
    setLoading(true);
    (async () => {
      const supabase = createClient();
      const lots = await supabase.from("auction_lots").select("player_id, status, sold_price, sold_team_id").eq("tournament_id", tournamentId).in("status", tab === "sold" ? ["sold"] : tab === "all" ? ["upcoming", "unsold", "sold", "on_block"] : ["upcoming", "unsold"]).limit(500);
      const ids = (lots.data ?? []).map((l) => l.player_id);
      const [pool, names, teams] = await Promise.all([
        ids.length ? supabase.from("pool_players").select("user_id, category, base_price, sequence_no").eq("tournament_id", tournamentId).in("user_id", ids).order("sequence_no", { ascending: true, nullsFirst: false }).limit(500) : Promise.resolve({ data: [] }),
        ids.length ? supabase.from("public_profiles").select("id, full_name").in("id", ids.slice(0, 200)) : Promise.resolve({ data: [] }),
        tab === "sold" || tab === "all" ? supabase.from("public_teams").select("id, name").eq("tournament_id", tournamentId).limit(64) : Promise.resolve({ data: [] }),
      ]);
      if (cancelled) return;
      const nm = new Map((names.data ?? []).map((p) => [p.id, p.full_name ?? "Player"]));
      const tm = new Map((teams.data ?? []).map((t) => [t.id, t.name ?? "Team"]));
      const byPlayer = new Map((lots.data ?? []).map((l) => [l.player_id, l]));
      setItems((pool.data ?? []).filter((p) => byPlayer.has(p.user_id)).map((p) => {
        const l = byPlayer.get(p.user_id)!;
        return { id: p.user_id, name: nm.get(p.user_id) ?? "Player", category: p.category, basePrice: p.base_price, price: l.sold_price, team: l.sold_team_id ? tm.get(l.sold_team_id) ?? null : null, status: l.status, sequence: p.sequence_no };
      }));
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [tournamentId, tab, version]);

  return { items, loading };
}
