import { isoToLocal } from "@/lib/organizer/datetime";
import { defaultRules, type AuctionInput } from "@/lib/organizer/schemas";
import type { TournamentRow } from "@/lib/organizer/guard";

export interface SportOption {
  id: string;
  slug: string;
  name: string;
  config: { roles?: string[]; match_formats?: Array<{ key: string; label: string; overs: number | null }>; ball_types?: string[] };
}
export interface CityOption {
  id: string;
  name: string;
}
export interface TierOption {
  id: string;
  name: string;
  min_teams: number;
  max_teams: number;
  amount_paise: number;
}

export interface DraftState {
  name: string;
  slug: string;
  sportId: string;
  cityId: string;
  venueName: string;
  venueAddress: string;
  startDate: string;
  endDate: string;
  bannerUrl: string | null;
  logoUrl: string | null;
  descriptionShort: string;
  descriptionFull: string;
  format: "league" | "knockout" | "league_playoffs" | "groups_knockout";
  teamCount: number;
  leagueLegs: 1 | 2;
  playoffStyle: "top2_final" | "top4_semis" | "qualifier_style" | "top8_quarters" | null;
  groupCount: number | null;
  advancePerGroup: 1 | 2 | null;
  thirdPlaceMatch: boolean;
  seedingMethod: "random" | "manual";
  rules: Record<string, unknown>;
  squadMode: "auction" | "direct";
  squadMin: number;
  squadMax: number;
  playerPoolCap: number | null;
  squadLockDeadline: string;
  allowPlayerApplications: boolean;
  auction: AuctionInput;
  teamEntry: "invite" | "open" | "both";
  teamDeadline: string;
  playerDeadline: string;
  customQuestions: Array<{ q: string; required: boolean }>;
  visibility: "public" | "unlisted";
  showContact: boolean;
  contactPhone: string;
  contactEmail: string;
  entryFeeInfo: string;
  prizePoolText: string;
  prizes: Array<{ position: string; prize: string }>;
  awards: string[];
  rulesText: string;
  codeOfConduct: boolean;
  confirmed: boolean;
}

export const DEFAULT_CATEGORIES: Record<string, string[]> = {
  cricket: ["Batter", "Bowler", "All-rounder", "Wicket-keeper"],
  football: ["GK", "DEF", "MID", "FWD"],
};

export function defaultAuction(sport: string): AuctionInput {
  const categories = DEFAULT_CATEGORIES[sport] ?? DEFAULT_CATEGORIES.cricket;
  return {
    mode: "live",
    purse: 1000,
    categories,
    basePrices: Object.fromEntries(categories.map((c) => [c, 20])),
    incrementSlabs: [
      { from: 0, to: 100, step: 5 },
      { from: 100, to: 300, step: 10 },
      { from: 300, to: null, step: 25 },
    ],
    reserveRule: true,
    categoryLimits: {},
    sequenceMode: "random",
    scheduledAt: "",
  };
}

export function emptyDraft(sport: SportOption | undefined, defaultCityId: string): DraftState {
  const slug = sport?.slug ?? "cricket";
  const rules = defaultRules(slug) as Record<string, unknown>;
  const players = Number((rules as { players_per_side?: number }).players_per_side ?? 11);
  return {
    name: "", slug: "", sportId: sport?.id ?? "", cityId: defaultCityId, venueName: "", venueAddress: "",
    startDate: "", endDate: "", bannerUrl: null, logoUrl: null, descriptionShort: "", descriptionFull: "",
    format: "league", teamCount: 4, leagueLegs: 1, playoffStyle: null, thirdPlaceMatch: false, seedingMethod: "random", groupCount: null, advancePerGroup: null,
    rules, squadMode: "direct", squadMin: players, squadMax: Math.min(25, players + 4), playerPoolCap: null,
    squadLockDeadline: "", allowPlayerApplications: true, auction: defaultAuction(slug),
    teamEntry: "invite", teamDeadline: "", playerDeadline: "", customQuestions: [], visibility: "public",
    showContact: false, contactPhone: "", contactEmail: "", entryFeeInfo: "",
    prizePoolText: "", prizes: [], awards: [], rulesText: "", codeOfConduct: false, confirmed: false,
  };
}

type PrizeItem = { type?: string; text?: string; position?: string; prize?: string };

export function fromRow(
  t: TournamentRow,
  sport: SportOption | undefined,
  auction: { mode: string; purse: number; categories: unknown; base_prices: unknown; increment_slabs: unknown; reserve_rule: boolean; category_limits: unknown; sequence_mode: string; scheduled_at: string | null } | null
): DraftState {
  const base = emptyDraft(sport, t.city_id);
  const prizesArr = (Array.isArray(t.prizes) ? t.prizes : []) as PrizeItem[];
  return {
    ...base,
    name: t.name, slug: t.slug, sportId: t.sport_id, cityId: t.city_id, venueName: t.venue_name ?? "", venueAddress: t.venue_address ?? "",
    startDate: t.start_date ?? "", endDate: t.end_date ?? "", bannerUrl: t.banner_url, logoUrl: t.logo_url,
    descriptionShort: t.description_short ?? "", descriptionFull: t.description_full ?? "",
    format: t.format, teamCount: t.team_count, leagueLegs: t.league_legs === 2 ? 2 : 1,
    playoffStyle: (t.playoff_style as DraftState["playoffStyle"]) ?? null, thirdPlaceMatch: t.third_place_match, groupCount: t.group_count, advancePerGroup: t.advance_per_group === 1 ? 1 : t.advance_per_group === 2 ? 2 : null,
    seedingMethod: t.seeding_method === "manual" ? "manual" : "random",
    rules: t.rules && typeof t.rules === "object" && Object.keys(t.rules as object).length > 0 ? (t.rules as Record<string, unknown>) : base.rules,
    squadMode: t.squad_mode, squadMin: t.squad_min ?? base.squadMin, squadMax: t.squad_max ?? base.squadMax,
    playerPoolCap: t.player_pool_cap, squadLockDeadline: isoToLocal(t.squad_lock_deadline), allowPlayerApplications: t.allow_player_applications,
    auction: auction
      ? {
          mode: auction.mode === "simple" ? "simple" : "live", purse: auction.purse,
          categories: (auction.categories as string[])?.length ? (auction.categories as string[]) : base.auction.categories,
          basePrices: (auction.base_prices as Record<string, number>) ?? {}, incrementSlabs: (auction.increment_slabs as AuctionInput["incrementSlabs"]) ?? base.auction.incrementSlabs,
          reserveRule: auction.reserve_rule, categoryLimits: (auction.category_limits as Record<string, number>) ?? {},
          sequenceMode: (auction.sequence_mode as AuctionInput["sequenceMode"]) ?? "random", scheduledAt: isoToLocal(auction.scheduled_at),
        }
      : base.auction,
    teamEntry: t.team_entry, teamDeadline: isoToLocal(t.team_deadline), playerDeadline: isoToLocal(t.player_deadline),
    customQuestions: (Array.isArray(t.custom_questions) ? t.custom_questions : []) as DraftState["customQuestions"],
    visibility: t.visibility, showContact: t.show_contact, contactPhone: t.contact_phone ?? "", contactEmail: t.contact_email ?? "", entryFeeInfo: t.entry_fee_info ?? "",
    prizePoolText: prizesArr.find((p) => p.type === "pool")?.text ?? "",
    prizes: prizesArr.filter((p) => p.type === "position").map((p) => ({ position: p.position ?? "", prize: p.prize ?? "" })),
    awards: t.individual_awards ?? [], rulesText: t.rules_text ?? "", codeOfConduct: Boolean(t.rules_text) || t.status !== "draft",
    confirmed: false,
  };
}
