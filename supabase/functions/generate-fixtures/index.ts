// supabase/functions/generate-fixtures/index.ts
// POST { tournament_id, action: 'generate' | 'playoffs', options?: { start_date, matches_per_day, times[], venues[], manual_order[] } }
// Writes unpublished matches. The organizer reviews them, then flips matches.fixture_published to true.
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { adminClient, getUser, isAdmin, json, handleOptions } from "../_shared/clients.ts";
import { roundRobin, knockoutTree, shuffle, scheduleSlots, addDays, splitIntoGroups, groupKnockoutSeeds } from "../_shared/fixtures.ts";

serve(async (req) => {
  const pre = handleOptions(req); if (pre) return pre;
  try {
    const user = await getUser(req);
    if (!user) return json({ error: "not_authenticated" }, 401);
    const { tournament_id, action = "generate", options = {} } = await req.json();
    const sb = adminClient();

    const { data: t } = await sb.from("tournaments").select("*").eq("id", tournament_id).single();
    if (!t || (t.organizer_id !== user.id && !(await isAdmin(user.id)))) return json({ error: "forbidden" }, 403);
    if (!["registration_closed", "auction", "squads_locked", "live"].includes(t.status)) return json({ error: "invalid_status" }, 409);

    const { data: teams } = await sb.from("teams").select("id").eq("tournament_id", t.id).eq("status", "approved");
    if (!teams || teams.length < 3) return json({ error: "need_three_teams" }, 422);

    const times: string[] = options.times?.length ? options.times : ["10:00", "14:00"];
    const venues: string[] = options.venues?.length ? options.venues : [t.venue_name ?? ""];
    const venueFor = (i: number) => venues[i % venues.length] || null;
    const cleanRow = (r: Record<string, unknown>) => ({ tournament_id: t.id, fixture_published: false, ...r });

    if (action === "generate") {
      const { count: published } = await sb.from("matches").select("id", { count: "exact", head: true })
        .eq("tournament_id", t.id).not("result_published_at", "is", null);
      if ((published ?? 0) > 0) return json({ error: "results_exist" }, 409);
      await sb.from("matches").delete().eq("tournament_id", t.id);

      const ids = teams.map((x) => x.id as string);
      let order = ids;
      if (Array.isArray(options.manual_order)) {
        if (new Set(options.manual_order).size !== ids.length || !options.manual_order.every((x: string) => ids.includes(x))) return json({ error: "invalid_manual_order" }, 422);
        order = options.manual_order;
      } else order = shuffle(ids);
      const startDate: string = options.start_date ?? t.start_date;
      if (!startDate) return json({ error: "start_date_required" }, 422);

      if (t.format === "league" || t.format === "league_playoffs") {
        const pairs = roundRobin(order, t.league_legs === 2 ? 2 : 1);
        const perDay = Math.max(1, Math.min(options.matches_per_day ?? 2, Math.floor(ids.length / 2)));
        const slots = scheduleSlots(pairs.length, startDate, perDay, times);
        const rows = pairs.map((p, i) => cleanRow({ stage: "league", round_no: p.round, match_no: i + 1, team_a_id: p.a, team_b_id: p.b, scheduled_at: slots[i], venue: venueFor(i) }));
        const { error } = await sb.from("matches").insert(rows);
        if (error) throw error;
        return json({ ok: true, matches: rows.length });
      }

      if (t.format === "groups_knockout") {
        const gc: number = t.group_count ?? 2;
        if (ids.length < gc * 2) return json({ error: "too_few_teams_for_groups" }, 422);
        const groups = splitIntoGroups(order, gc);
        for (let g = 0; g < groups.length; g++) await sb.from("teams").update({ group_no: g + 1 }).in("id", groups[g]);
        const gp = groups.map((members, g) => roundRobin(members, t.league_legs === 2 ? 2 : 1).map((p) => ({ ...p, g: g + 1 })));
        const maxRounds = Math.max(...gp.map((x) => x.reduce((m, p) => Math.max(m, p.round), 0)));
        const flat: { round: number; a: string; b: string; g: number }[] = [];
        for (let r = 1; r <= maxRounds; r++) for (const list of gp) for (const p of list) if (p.round === r) flat.push(p);
        const perDay = Math.max(1, Math.min(options.matches_per_day ?? 2, Math.floor(ids.length / 2)));
        const slots = scheduleSlots(flat.length, startDate, perDay, times);
        const rows = flat.map((p, i) => cleanRow({ stage: "group", group_no: p.g, round_no: p.round, match_no: i + 1, team_a_id: p.a, team_b_id: p.b, scheduled_at: slots[i], venue: venueFor(i) }));
        const { error } = await sb.from("matches").insert(rows);
        if (error) throw error;
        return json({ ok: true, matches: rows.length });
      }

      // Knockout
      const { nodes, rounds } = knockoutTree(order);
      const real = nodes.filter((n) => !n.bye).sort((x, y) => x.round - y.round || x.index - y.index);
      const perDay = Math.max(1, Math.min(options.matches_per_day ?? 2, 4));
      const withThird = t.third_place_match && rounds >= 2;
      const total = real.length + (withThird ? 1 : 0);
      const slots = scheduleSlots(total, startDate, perDay, times);
      let si = 0;
      const rows: Record<string, unknown>[] = [];
      for (const n of real) {
        if (withThird && n.stage === "final") { rows.push(cleanRow({ stage: "third_place", round_no: n.round, match_no: real.length + 1, label_a: "Loser of semi 1", label_b: "Loser of semi 2", scheduled_at: slots[si], venue: venueFor(si) })); si++; }
        rows.push(cleanRow({
          stage: n.stage, round_no: n.round, match_no: n.matchNo, team_a_id: n.a, team_b_id: n.b,
          label_a: n.fromA ? `Winner of match ${n.fromA.matchNo}` : null, label_b: n.fromB ? `Winner of match ${n.fromB.matchNo}` : null,
          scheduled_at: slots[si], venue: venueFor(si),
        })); si++;
      }
      const { data: inserted, error } = await sb.from("matches").insert(rows).select("id, match_no");
      if (error) throw error;
      const idByNo = new Map(inserted!.map((m) => [m.match_no, m.id]));
      for (const parent of real) {
        for (const [child, slot] of [[parent.fromA, "a"], [parent.fromB, "b"]] as const) {
          if (child?.matchNo) await sb.from("matches").update({ next_match_id: idByNo.get(parent.matchNo!), next_slot: slot }).eq("id", idByNo.get(child.matchNo));
        }
      }
      if (withThird) {
        const thirdId = idByNo.get(real.length + 1);
        const semis = real.filter((n) => n.stage === "semi");
        for (let i = 0; i < semis.length; i++) {
          await sb.from("matches").update({ loser_next_match_id: thirdId, loser_next_slot: i === 0 ? "a" : "b" }).eq("id", idByNo.get(semis[i].matchNo!));
        }
      }
      return json({ ok: true, matches: rows.length });
    }

    if (action === "playoffs") {
      if (t.format !== "league_playoffs" && t.format !== "groups_knockout") return json({ error: "not_playoff_format" }, 422);
      const groupStage = t.format === "groups_knockout" ? "group" : "league";
      const { count: open } = await sb.from("matches").select("id", { count: "exact", head: true }).eq("tournament_id", t.id).eq("stage", groupStage).is("result_published_at", null);
      if ((open ?? 0) > 0) return json({ error: "league_not_finished" }, 409);
      const { count: playedPO } = await sb.from("matches").select("id", { count: "exact", head: true }).eq("tournament_id", t.id).neq("stage", groupStage).not("result_published_at", "is", null);
      if ((playedPO ?? 0) > 0) return json({ error: "results_exist" }, 409);
      await sb.from("matches").delete().eq("tournament_id", t.id).neq("stage", groupStage);

      const { data: st } = await sb.from("standings").select("team_id, group_no").eq("tournament_id", t.id).order("position", { ascending: true });
      const p = (st ?? []).map((x) => x.team_id as string);
      if (t.format === "groups_knockout") {
        const gc: number = t.group_count ?? 2;
        const adv: 1 | 2 = t.advance_per_group === 1 ? 1 : 2;
        const ranked: string[][] = Array.from({ length: gc }, () => []);
        for (const x of st ?? []) if (x.group_no) ranked[x.group_no - 1]?.push(x.team_id as string);
        const seeds = groupKnockoutSeeds(ranked, adv);
        if (seeds.length < 2) return json({ error: "not_enough_teams" }, 422);
        const { data: lastM } = await sb.from("matches").select("scheduled_at, match_no").eq("tournament_id", t.id).order("match_no", { ascending: false }).limit(1).single();
        const ko0: string = options.start_date ?? addDays((lastM?.scheduled_at ?? new Date().toISOString()).slice(0, 10), 1);
        const { nodes, rounds } = knockoutTree(seeds);
        const real = nodes.filter((n) => !n.bye).sort((x, y) => x.round - y.round || x.index - y.index);
        const withThird = !!t.third_place_match && rounds >= 2;
        const per = Math.max(1, Math.min(options.matches_per_day ?? 2, 4));
        const sl = scheduleSlots(real.length + (withThird ? 1 : 0), ko0, per, times);
        const base = lastM?.match_no ?? 0;
        let si = 0;
        const kr: Record<string, unknown>[] = [];
        for (const n of real) {
          if (withThird && n.stage === "final") { kr.push(cleanRow({ stage: "third_place", round_no: n.round, match_no: base + real.length + 1, label_a: "Loser of semi 1", label_b: "Loser of semi 2", scheduled_at: sl[si], venue: venueFor(si) })); si++; }
          kr.push(cleanRow({ stage: n.stage, round_no: n.round, match_no: base + n.matchNo!, team_a_id: n.a, team_b_id: n.b,
            label_a: n.fromA ? `Winner of match ${base + n.fromA.matchNo!}` : null, label_b: n.fromB ? `Winner of match ${base + n.fromB.matchNo!}` : null,
            scheduled_at: sl[si], venue: venueFor(si) })); si++;
        }
        const { data: ins2, error: e2 } = await sb.from("matches").insert(kr).select("id, match_no");
        if (e2) throw e2;
        const byNo = new Map(ins2!.map((m) => [m.match_no, m.id]));
        for (const parent of real) {
          for (const [child, slot] of [[parent.fromA, "a"], [parent.fromB, "b"]] as const) {
            if (child?.matchNo) await sb.from("matches").update({ next_match_id: byNo.get(base + parent.matchNo!), next_slot: slot }).eq("id", byNo.get(base + child.matchNo));
          }
        }
        if (withThird) {
          const thirdId = byNo.get(base + real.length + 1);
          const semis = real.filter((n) => n.stage === "semi");
          for (let i = 0; i < semis.length; i++) await sb.from("matches").update({ loser_next_match_id: thirdId, loser_next_slot: i === 0 ? "a" : "b" }).eq("id", byNo.get(base + semis[i].matchNo!));
        }
        return json({ ok: true, matches: kr.length });
      }
      const { data: last } = await sb.from("matches").select("scheduled_at, match_no").eq("tournament_id", t.id).order("match_no", { ascending: false }).limit(1).single();
      const start: string = options.start_date ?? addDays((last?.scheduled_at ?? new Date().toISOString()).slice(0, 10), 1);
      const style: string = t.playoff_style ?? "top4_semis";
      let no = (last?.match_no ?? 0);
      const at = (day: number, slot: number) => `${addDays(start, day)}T${times[slot % times.length]}:00+05:30`;
      const mk = (stage: string, round: number, day: number, slot: number, a: string | null, b: string | null, la?: string, lb?: string) =>
        cleanRow({ stage, round_no: round, match_no: ++no, team_a_id: a, team_b_id: b, label_a: la ?? null, label_b: lb ?? null, scheduled_at: at(day, slot), venue: venueFor(slot) });

      let rows: Record<string, unknown>[] = [];
      if (style === "top2_final") {
        if (p.length < 2) return json({ error: "not_enough_teams" }, 422);
        rows = [mk("final", 1, 0, 0, p[0], p[1])];
      } else if (style === "top8_quarters") {
        if (p.length < 8) return json({ error: "not_enough_teams" }, 422);
        rows = [mk("quarter", 1, 0, 0, p[0], p[7]), mk("quarter", 1, 0, 1, p[3], p[4]), mk("quarter", 1, 1, 0, p[1], p[6]), mk("quarter", 1, 1, 1, p[2], p[5]),
                mk("semi", 2, 2, 0, null, null, "Winner of QF 1", "Winner of QF 2"), mk("semi", 2, 2, 1, null, null, "Winner of QF 3", "Winner of QF 4"),
                mk("final", 3, 3, 0, null, null, "Winner of Semi 1", "Winner of Semi 2")];
      } else if (style === "qualifier_style") {
        if (p.length < 4) return json({ error: "not_enough_teams" }, 422);
        rows = [mk("qualifier1", 1, 0, 0, p[0], p[1]), mk("eliminator", 1, 0, 1, p[2], p[3]),
                mk("qualifier2", 2, 1, 0, null, null, "Loser of Qualifier 1", "Winner of Eliminator"),
                mk("final", 3, 2, 0, null, null, "Winner of Qualifier 1", "Winner of Qualifier 2")];
      } else {
        if (p.length < 4) return json({ error: "not_enough_teams" }, 422);
        rows = [mk("semi", 1, 0, 0, p[0], p[3]), mk("semi", 1, 0, 1, p[1], p[2]),
                mk("final", 2, 1, 0, null, null, "Winner of Semi 1", "Winner of Semi 2")];
      }
      const { data: ins, error } = await sb.from("matches").insert(rows).select("id, stage, match_no");
      if (error) throw error;
      const by = (stage: string, nth = 0) => ins!.filter((m) => m.stage === stage)[nth]?.id as string;
      const link = (from: string, patch: Record<string, unknown>) => sb.from("matches").update(patch).eq("id", from);
      if (style === "qualifier_style") {
        await link(by("qualifier1"), { next_match_id: by("final"), next_slot: "a", loser_next_match_id: by("qualifier2"), loser_next_slot: "a" });
        await link(by("eliminator"), { next_match_id: by("qualifier2"), next_slot: "b" });
        await link(by("qualifier2"), { next_match_id: by("final"), next_slot: "b" });
      } else if (style === "top8_quarters") {
        for (let i = 0; i < 4; i++) await link(by("quarter", i), { next_match_id: by("semi", Math.floor(i / 2)), next_slot: i % 2 === 0 ? "a" : "b" });
        await link(by("semi", 0), { next_match_id: by("final"), next_slot: "a" });
        await link(by("semi", 1), { next_match_id: by("final"), next_slot: "b" });
      } else if (style !== "top2_final") {
        await link(by("semi", 0), { next_match_id: by("final"), next_slot: "a" });
        await link(by("semi", 1), { next_match_id: by("final"), next_slot: "b" });
      }
      return json({ ok: true, matches: rows.length });
    }
    return json({ error: "invalid_action" }, 422);
  } catch (e) {
    console.error("generate-fixtures", e);
    return json({ error: "server_error" }, 500);
  }
});
