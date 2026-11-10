import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireOwnedTournament } from "@/lib/organizer/guard";
import { csvCell } from "@/lib/csv";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const { tournament: t } = await requireOwnedTournament(id);
  const supabase = await createClient();
  const { data: lots } = await supabase.from("auction_lots").select("player_id, status, sold_price, sold_team_id").eq("tournament_id", t.id).limit(2000);
  const ids = (lots ?? []).map((l) => l.player_id);
  const [pool, profiles, teams] = await Promise.all([
    supabase.from("pool_players").select("user_id, category, base_price").eq("tournament_id", t.id).limit(2000),
    ids.length ? supabase.from("public_profiles").select("id, full_name").in("id", ids.slice(0, 300)) : Promise.resolve({ data: [] }),
    supabase.from("teams").select("id, name").eq("tournament_id", t.id).limit(64),
  ]);
  const nm = new Map((profiles.data ?? []).map((p) => [p.id, p.full_name]));
  const tm = new Map((teams.data ?? []).map((x) => [x.id, x.name]));
  const pl = new Map((pool.data ?? []).map((p) => [p.user_id, p]));
  const rows = [["Player", "Category", "Base price", "Status", "Team", "Sold price"], ...(lots ?? []).map((l) => [nm.get(l.player_id) ?? "", pl.get(l.player_id)?.category ?? "", pl.get(l.player_id)?.base_price ?? "", l.status, l.sold_team_id ? tm.get(l.sold_team_id) ?? "" : "", l.sold_price ?? ""])];
  const csv = "﻿" + rows.map((r) => r.map(csvCell).join(",")).join("\r\n") + "\r\n";
  return new NextResponse(csv, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="${t.slug}-auction.csv"`, "Cache-Control": "private, no-store" } });
}
