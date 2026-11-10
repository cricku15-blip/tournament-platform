import { unstable_cache } from "next/cache";
import { publicDb } from "./client";
import { likePattern, type TournamentFilters } from "./filters";

export const PAGE_SIZE = 12;

const LIST_COLUMNS =
  "id, name, slug, sport_slug, sport_name, city_id, city_name, city_slug, start_date, end_date, status, squad_mode, team_count, approved_team_count, banner_url, logo_url, organizer_name, format";

export type TournamentListItem = {
  id: string;
  name: string;
  slug: string;
  sport_slug: string;
  sport_name: string;
  city_id: string;
  city_name: string;
  city_slug: string;
  start_date: string | null;
  end_date: string | null;
  status: string;
  squad_mode: string;
  team_count: number;
  approved_team_count: number | null;
  banner_url: string | null;
  logo_url: string | null;
  organizer_name: string | null;
  format: string;
};

/* ---------- reference data ---------- */

export const getCities = unstable_cache(
  async () => {
    const { data, error } = await publicDb.from("cities").select("id, name, slug, state").eq("is_active", true).order("sort_order");
    if (error) throw error;
    return data;
  },
  ["public:cities"],
  { revalidate: 300, tags: ["cities"] }
);

export const getSports = unstable_cache(
  async () => {
    const { data, error } = await publicDb.from("sports").select("id, slug, name").eq("is_active", true).order("name");
    if (error) throw error;
    return data;
  },
  ["public:sports"],
  { revalidate: 300, tags: ["sports"] }
);

export const getSiteSetting = unstable_cache(
  async (key: string) => {
    const { data } = await publicDb.from("site_settings").select("value").eq("key", key).maybeSingle();
    return (data?.value ?? null) as unknown;
  },
  ["public:setting"],
  { revalidate: 300, tags: ["site_settings"] }
);

/** Returns null (never stale/hard-coded numbers) when the query fails. */
export const getPricing = unstable_cache(
  async () => {
    const [tiers, plans] = await Promise.all([
      publicDb.from("pricing_tiers").select("id, name, amount_paise, max_teams, description").eq("is_active", true).order("amount_paise"),
      publicDb.from("player_plans").select("id, name, amount_paise, description, benefits, grace_days").eq("is_active", true).order("amount_paise"),
    ]);
    if (tiers.error || plans.error) return null;
    return { tiers: tiers.data, plans: plans.data };
  },
  ["public:pricing"],
  { revalidate: 300, tags: ["pricing"] }
);

/* ---------- tournaments ---------- */

async function listTournamentsUncached(f: TournamentFilters) {
  const page = f.page ?? 1;
  let q = publicDb.from("public_tournaments").select(LIST_COLUMNS).eq("visibility", "public");
  if (f.sport) q = q.eq("sport_slug", f.sport);
  if (f.city) q = q.eq("city_slug", f.city);
  if (f.status) q = q.eq("status", f.status);
  if (f.mode) q = q.eq("squad_mode", f.mode);
  if (f.from) q = q.gte("start_date", f.from);
  if (f.to) q = q.lte("start_date", f.to);
  if (f.q) q = q.ilike("name", likePattern(f.q));
  const from = (page - 1) * PAGE_SIZE;
  const { data, error } = await q
    .order("start_date", { ascending: true, nullsFirst: false })
    .order("id", { ascending: false })
    .range(from, from + PAGE_SIZE); // one extra row tells us if there is a next page
  if (error) return { error: true as const, items: [] as TournamentListItem[], hasMore: false };
  const rows = (data ?? []) as unknown as TournamentListItem[];
  const items = rows.slice(0, PAGE_SIZE);
  // Live first within the page.
  items.sort((a, b) => Number(b.status === "live") - Number(a.status === "live"));
  return { error: false as const, items, hasMore: rows.length > PAGE_SIZE };
}

export function listTournaments(f: TournamentFilters) {
  return unstable_cache(() => listTournamentsUncached(f), ["public:tournaments", JSON.stringify(f)], {
    revalidate: 60,
    tags: ["tournaments"],
  })();
}

export const getCityTournaments = unstable_cache(
  async (cityId: string) => {
    const { data } = await publicDb
      .from("public_tournaments")
      .select(LIST_COLUMNS)
      .eq("visibility", "public")
      .eq("city_id", cityId)
      .order("start_date", { ascending: true, nullsFirst: false })
      .limit(12);
    return (data ?? []) as unknown as TournamentListItem[];
  },
  ["public:city-tournaments"],
  { revalidate: 120, tags: ["tournaments"] }
);

export const getCityBySlug = unstable_cache(
  async (slug: string) => {
    const { data } = await publicDb.from("cities").select("id, name, slug, state").eq("slug", slug).eq("is_active", true).maybeSingle();
    if (!data) return null;
    const [t, teams, players] = await Promise.all([
      publicDb.from("public_tournaments").select("approved_team_count, approved_player_count").eq("city_id", data.id).eq("visibility", "public").limit(500),
      Promise.resolve(null),
      Promise.resolve(null),
    ]);
    void teams;
    void players;
    const rows = t.data ?? [];
    return {
      ...data,
      stats: {
        tournaments: rows.length,
        teams: rows.reduce((n, r) => n + (r.approved_team_count ?? 0), 0),
        players: rows.reduce((n, r) => n + (r.approved_player_count ?? 0), 0),
      },
    };
  },
  ["public:city"],
  { revalidate: 300, tags: ["cities", "tournaments"] }
);

const TOURNAMENT_COLUMNS =
  "id, name, slug, sport_id, sport_slug, sport_name, city_id, city_name, city_slug, venue_name, venue_address, start_date, end_date, format, team_count, league_legs, playoff_style, third_place_match, rules, squad_mode, squad_min, squad_max, team_entry, team_deadline, player_deadline, allow_player_applications, visibility, contact_phone, contact_email, entry_fee_info, prizes, individual_awards, rules_text, description_short, description_full, banner_url, logo_url, status, cancelled_reason, published_at, approved_team_count, approved_player_count, organizer_id, organizer_name, organizer_avatar";

export type TournamentFull = Record<string, unknown> & {
  id: string;
  name: string;
  slug: string;
  sport_slug: string;
  sport_name: string;
  city_name: string;
  city_slug: string;
  status: string;
  squad_mode: string;
  format: string;
  team_count: number;
  approved_team_count: number | null;
  approved_player_count: number | null;
  banner_url: string | null;
  logo_url: string | null;
  start_date: string | null;
  end_date: string | null;
  venue_name: string | null;
  venue_address: string | null;
  description_short: string | null;
  description_full: string | null;
  rules_text: string | null;
  cancelled_reason: string | null;
  visibility: string;
  organizer_name: string | null;
  organizer_avatar: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  prizes: unknown;
  individual_awards: unknown;
  rules: unknown;
  entry_fee_info: string | null;
  playoff_style: string | null;
  league_legs: number;
  third_place_match: boolean;
};

export type TournamentLookup =
  | { kind: "found"; tournament: TournamentFull }
  | { kind: "redirect"; slug: string }
  | { kind: "missing" };

export const getTournamentBySlug = (slug: string) =>
  unstable_cache(
    async (): Promise<TournamentLookup> => {
      const { data } = await publicDb.from("public_tournaments").select(TOURNAMENT_COLUMNS).eq("slug", slug).maybeSingle();
      if (data) return { kind: "found", tournament: data as unknown as TournamentFull };
      const { data: redirect } = await publicDb.from("slug_redirects").select("tournament_id").eq("old_slug", slug).maybeSingle();
      if (redirect) {
        const { data: t } = await publicDb.from("public_tournaments").select("slug").eq("id", redirect.tournament_id).maybeSingle();
        if (t) return { kind: "redirect", slug: t.slug };
      }
      return { kind: "missing" };
    },
    ["public:tournament", slug],
    { revalidate: 60, tags: [`tournament-slug:${slug}`] }
  )();

/** Data for tournament sub-pages. All cached with tag `tournament:<id>`. */
export function tournamentData<T>(id: string, name: string, fn: () => Promise<T>) {
  return unstable_cache(fn, ["public:t", id, name], { revalidate: 60, tags: [`tournament:${id}`] })();
}

export function getTournamentTeams(id: string) {
  return tournamentData(id, "teams", async () => {
    const { data } = await publicDb
      .from("public_teams")
      .select("id, name, slug, logo_url, color_primary, color_secondary, home_ground, squad_size, squad_locked")
      .eq("tournament_id", id)
      .order("name")
      .limit(100);
    return data ?? [];
  });
}

export function getTournamentMatches(id: string) {
  return tournamentData(id, "matches", async () => {
    const { data } = await publicDb
      .from("matches")
      .select(
        "id, stage, round_no, match_no, team_a_id, team_b_id, label_a, label_b, next_match_id, next_slot, scheduled_at, venue, status, result_type, winner_team_id, result_text, score_a, score_b, result_published_at"
      )
      .eq("tournament_id", id)
      .eq("fixture_published", true)
      .order("scheduled_at", { ascending: true, nullsFirst: false })
      .order("match_no", { ascending: true })
      .limit(300);
    return data ?? [];
  });
}

export function getTournamentStandings(id: string) {
  return tournamentData(id, "standings", async () => {
    const { data } = await publicDb
      .from("standings")
      .select("team_id, played, won, lost, tied, drawn, no_result, points, nrr, gf, ga, gd, position")
      .eq("tournament_id", id)
      .order("position", { ascending: true, nullsFirst: false })
      .limit(100);
    return data ?? [];
  });
}

export function getAnnouncements(id: string) {
  return tournamentData(id, "announcements", async () => {
    const { data } = await publicDb
      .from("announcements")
      .select("id, title, body, is_pinned, created_at")
      .eq("tournament_id", id)
      .order("is_pinned", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(5);
    return data ?? [];
  });
}

export type LeaderRow = { player_id: string; name: string; username: string | null; value: string; sub?: string };

async function namesFor(ids: string[]) {
  const map = new Map<string, { full_name: string | null; username: string | null }>();
  if (ids.length === 0) return map;
  const { data } = await publicDb.from("public_profiles").select("id, full_name, username").in("id", ids);
  for (const p of data ?? []) if (p.id) map.set(p.id, p);
  return map;
}

export function getTournamentLeaderboards(id: string, sport: string) {
  return tournamentData(id, `leaders:${sport}`, async () => {
    type Board = { key: string; title: string; rows: LeaderRow[] };
    const boards: Board[] = [];
    const take = 10;
    if (sport === "cricket") {
      const [bat, bowl] = await Promise.all([
        publicDb.from("tournament_batting_stats").select("player_id, runs, balls, highest_score, strike_rate").eq("tournament_id", id).order("runs", { ascending: false }).limit(50),
        publicDb.from("tournament_bowling_stats").select("player_id, wickets, balls_bowled, runs_conceded, economy, best_figures").eq("tournament_id", id).order("wickets", { ascending: false }).limit(50),
      ]);
      const ids = [...new Set([...(bat.data ?? []).map((r) => r.player_id), ...(bowl.data ?? []).map((r) => r.player_id)])];
      const names = await namesFor(ids);
      const row = (pid: string, value: string, sub?: string): LeaderRow => ({
        player_id: pid,
        name: names.get(pid)?.full_name ?? "Player",
        username: names.get(pid)?.username ?? null,
        value,
        sub,
      });
      const b = bat.data ?? [];
      const w = bowl.data ?? [];
      boards.push({ key: "runs", title: "Most runs", rows: b.slice(0, take).map((r) => row(r.player_id, String(r.runs), `HS ${r.highest_score}`)) });
      boards.push({ key: "wickets", title: "Most wickets", rows: w.slice(0, take).map((r) => row(r.player_id, String(r.wickets), r.best_figures ? `Best ${r.best_figures}` : undefined)) });
      boards.push({
        key: "sr",
        title: "Best strike rate (min 30 balls)",
        rows: b.filter((r) => (r.balls ?? 0) >= 30 && r.strike_rate !== null).sort((x, y) => Number(y.strike_rate) - Number(x.strike_rate)).slice(0, take).map((r) => row(r.player_id, String(r.strike_rate), `${r.runs} runs`)),
      });
      boards.push({
        key: "econ",
        title: "Best economy (min 6 overs)",
        rows: w.filter((r) => (r.balls_bowled ?? 0) >= 36 && r.economy !== null).sort((x, y) => Number(x.economy) - Number(y.economy)).slice(0, take).map((r) => row(r.player_id, String(r.economy), `${r.wickets} wkts`)),
      });
    } else {
      const { data } = await publicDb.from("tournament_football_stats").select("player_id, goals, assists, yellow_cards, red_cards, clean_sheets").eq("tournament_id", id).limit(200);
      const rows = data ?? [];
      const names = await namesFor([...new Set(rows.map((r) => r.player_id).filter((x): x is string => typeof x === "string"))]);
      const row = (pid: string, value: string, sub?: string): LeaderRow => ({
        player_id: pid,
        name: names.get(pid)?.full_name ?? "Player",
        username: names.get(pid)?.username ?? null,
        value,
        sub,
      });
      const top = (key: "goals" | "assists" | "clean_sheets", title: string) => ({
        key,
        title,
        rows: [...rows].filter((r) => Number(r[key] ?? 0) > 0).sort((a, b) => Number(b[key] ?? 0) - Number(a[key] ?? 0)).slice(0, take).map((r) => row(r.player_id ?? "", String(r[key]))),
      });
      boards.push(top("goals", "Top scorers"), top("assists", "Most assists"), top("clean_sheets", "Clean sheets"));
    }
    return boards;
  });
}

/* ---------- team / match / player ---------- */

export function getTeam(tournamentId: string, teamSlug: string) {
  return tournamentData(tournamentId, `team:${teamSlug}`, async () => {
    const { data: team } = await publicDb
      .from("public_teams")
      .select("id, name, slug, logo_url, color_primary, color_secondary, description, home_ground, squad_locked, squad_size")
      .eq("tournament_id", tournamentId)
      .eq("slug", teamSlug)
      .maybeSingle();
    if (!team) return null;
    const { data: members } = await publicDb.from("squad_members").select("user_id, jersey_no, price").eq("team_id", team.id).limit(40);
    const names = new Map<string, { full_name: string | null; username: string | null; avatar_url: string | null }>();
    const ids = (members ?? []).map((m) => m.user_id);
    if (ids.length) {
      const { data: ps } = await publicDb.from("public_profiles").select("id, full_name, username, avatar_url").in("id", ids);
      for (const p of ps ?? []) if (p.id) names.set(p.id, p);
    }
    const squad = (members ?? [])
      .map((m) => ({ ...m, ...(names.get(m.user_id) ?? { full_name: null, username: null, avatar_url: null }) }))
      .sort((a, b) => (a.jersey_no ?? 999) - (b.jersey_no ?? 999));
    return { team, squad };
  });
}

export function getMatch(tournamentId: string, matchId: string) {
  return tournamentData(tournamentId, `match:${matchId}`, async () => {
    const { data: match } = await publicDb
      .from("matches")
      .select("id, stage, round_no, match_no, team_a_id, team_b_id, label_a, label_b, scheduled_at, venue, status, result_type, winner_team_id, result_text, player_of_match_id, score_a, score_b, toss, notes, result_published_at")
      .eq("id", matchId)
      .eq("tournament_id", tournamentId)
      .eq("fixture_published", true)
      .maybeSingle();
    if (!match) return null;
    const published = match.result_published_at !== null;
    const [bat, bowl, lineups, events, pom, h2h] = await Promise.all([
      published ? publicDb.from("cricket_batting").select("*").eq("match_id", matchId).order("innings").order("batting_order", { ascending: true }) : Promise.resolve({ data: [] as never[] }),
      published ? publicDb.from("cricket_bowling").select("*").eq("match_id", matchId).order("innings") : Promise.resolve({ data: [] as never[] }),
      published ? publicDb.from("football_lineups").select("*").eq("match_id", matchId) : Promise.resolve({ data: [] as never[] }),
      published ? publicDb.from("football_events").select("*").eq("match_id", matchId).order("minute", { ascending: true }) : Promise.resolve({ data: [] as never[] }),
      match.player_of_match_id ? publicDb.from("public_profiles").select("id, full_name, username").eq("id", match.player_of_match_id).maybeSingle() : Promise.resolve({ data: null }),
      match.team_a_id && match.team_b_id
        ? publicDb.from("matches").select("id", { count: "exact", head: true }).eq("tournament_id", tournamentId).not("result_published_at", "is", null).or(`and(team_a_id.eq.${match.team_a_id},team_b_id.eq.${match.team_b_id}),and(team_a_id.eq.${match.team_b_id},team_b_id.eq.${match.team_a_id})`)
        : Promise.resolve({ count: 0 }),
    ]);
    const playerIds = new Set<string>();
    for (const r of [...(bat.data ?? []), ...(bowl.data ?? []), ...(lineups.data ?? []), ...(events.data ?? [])] as Array<Record<string, unknown>>) {
      for (const k of ["player_id", "bowler_id", "fielder_id", "assist_player_id", "sub_player_id"]) {
        const v = r[k];
        if (typeof v === "string") playerIds.add(v);
      }
    }
    const names = await namesFor([...playerIds]);
    return {
      match,
      batting: (bat.data ?? []) as Array<Record<string, unknown>>,
      bowling: (bowl.data ?? []) as Array<Record<string, unknown>>,
      lineups: (lineups.data ?? []) as Array<Record<string, unknown>>,
      events: (events.data ?? []) as Array<Record<string, unknown>>,
      names: Object.fromEntries(names),
      playerOfMatch: pom.data,
      headToHead: h2h.count ?? 0,
    };
  });
}

export const getPlayerByUsername = (username: string) =>
  unstable_cache(
    async () => {
      const { data: rawProfile } = await publicDb
        .from("public_profiles")
        .select("id, full_name, username, avatar_url, bio, city_id, age, show_stats")
        .eq("username", username)
        .maybeSingle();
      if (!rawProfile || !rawProfile.id) return null;
      const profile = { ...rawProfile, id: rawProfile.id as string };
      const [city, sports, bat, bowl, foot, history] = await Promise.all([
        profile.city_id ? publicDb.from("cities").select("name").eq("id", profile.city_id).maybeSingle() : Promise.resolve({ data: null }),
        publicDb.from("player_sport_profiles").select("details, sports(name, slug)").eq("user_id", profile.id),
        profile.show_stats ? publicDb.from("player_cricket_career").select("matches, runs, highest_score").eq("player_id", profile.id).maybeSingle() : Promise.resolve({ data: null }),
        profile.show_stats ? publicDb.from("player_bowling_career").select("matches, wickets").eq("player_id", profile.id).maybeSingle() : Promise.resolve({ data: null }),
        profile.show_stats ? publicDb.from("player_football_career").select("matches, goals, assists").eq("player_id", profile.id).maybeSingle() : Promise.resolve({ data: null }),
        publicDb.from("squad_members").select("team_id, tournament_id").eq("user_id", profile.id).limit(20),
      ]);
      const tids = [...new Set((history.data ?? []).map((h) => h.tournament_id))].filter((x): x is string => typeof x === "string");
      const tours = tids.length ? (await publicDb.from("public_tournaments").select("id, name, slug, sport_name").in("id", tids)).data ?? [] : [];
      return {
        profile,
        cityName: city.data?.name ?? null,
        sports: (sports.data ?? []) as unknown as Array<{ details: Record<string, unknown>; sports: { name: string; slug: string } | null }>,
        cricket: bat.data,
        bowling: bowl.data,
        football: foot.data,
        tournaments: tours,
      };
    },
    ["public:player", username],
    { revalidate: 120, tags: [`player:${username}`] }
  )();
