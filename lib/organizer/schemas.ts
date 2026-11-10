import { z } from "zod";

export const slugSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(3, "At least 3 characters.")
  .max(60)
  .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Use lowercase letters, numbers and single hyphens.");

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export function slugSuggestions(base: string): string[] {
  const b = slugify(base) || "tournament";
  const y = new Date().getFullYear();
  return [`${b}-${y}`, `${b}-2`, `${b}-${Math.floor(100 + Math.random() * 900)}`].map((s) => s.slice(0, 60));
}

const today = () => new Date().toISOString().slice(0, 10);
const dateStr = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Choose a date.");
const optionalDateTime = z.string().max(40).optional().or(z.literal(""));
const optionalUrl = z.string().max(500).optional().or(z.literal(""));
const uuid = z.string().uuid();

/* ----- Step 1 ----- */
export const basicsSchema = z
  .object({
    name: z.string().trim().min(4, "At least 4 characters.").max(80, "Up to 80 characters."),
    slug: slugSchema,
    sportId: uuid.describe("sport"),
    cityId: uuid.describe("city"),
    venueName: z.string().trim().min(3, "At least 3 characters.").max(100),
    venueAddress: optionalUrl,
    startDate: dateStr.refine((d) => d >= today(), "Start date can't be in the past."),
    endDate: dateStr,
    bannerUrl: z.string().url().nullable().optional(),
    logoUrl: z.string().url().nullable().optional(),
    descriptionShort: z.string().trim().min(20, "At least 20 characters.").max(240, "Up to 240 characters."),
    descriptionFull: z.string().max(4000, "Up to 4000 characters.").optional().or(z.literal("")),
  })
  .refine((v) => v.endDate >= v.startDate, { path: ["endDate"], message: "End date must be on or after the start date." });

/* ----- Step 2 ----- */
export const formatSchema = z
  .object({
    format: z.enum(["league", "knockout", "league_playoffs", "groups_knockout"]),
    teamCount: z.number().int().min(3, "At least 3 teams."),
    leagueLegs: z.union([z.literal(1), z.literal(2)]),
    playoffStyle: z.enum(["top2_final", "top4_semis", "qualifier_style", "top8_quarters"]).nullable().optional(),
    thirdPlaceMatch: z.boolean(),
    seedingMethod: z.enum(["random", "manual"]),
    groupCount: z.number().int().min(2).max(8).nullable().optional(),
    advancePerGroup: z.union([z.literal(1), z.literal(2)]).nullable().optional(),
  })
  .refine((v) => v.format !== "league_playoffs" || !!v.playoffStyle, { path: ["playoffStyle"], message: "Choose a playoff style." })
  .refine((v) => v.format !== "groups_knockout" || (!!v.groupCount && !!v.advancePerGroup), { path: ["groupCount"], message: "Choose the number of groups and how many advance." })
  .refine((v) => v.format !== "groups_knockout" || !v.groupCount || v.teamCount >= v.groupCount * 2, { path: ["groupCount"], message: "Each group needs at least 2 teams." });

/* ----- Step 3: rules come from sport config, stored in tournaments.rules ----- */
const points = z.object({ win: z.number().int().min(0).max(10), tie: z.number().int().min(0).max(10).optional(), draw: z.number().int().min(0).max(10).optional(), no_result: z.number().int().min(0).max(10).optional(), loss: z.number().int().min(0).max(10).optional() });

export const cricketRulesSchema = z.object({
  match_format: z.enum(["t10", "t20", "odi", "custom"]),
  overs: z.number().int().min(1).max(50),
  overs_per_bowler: z.number().int().min(1).max(50),
  ball_type: z.enum(["Tennis ball", "Leather", "Other"]),
  players_per_side: z.number().int().min(6).max(11),
  powerplay: z.boolean(),
  super_over: z.boolean(),
  points,
  tiebreakers: z.array(z.string()).min(1),
});

export const footballRulesSchema = z.object({
  format: z.enum(["11", "9", "7", "5"]),
  half_minutes: z.number().int().min(5).max(60),
  extra_time: z.boolean(),
  penalties: z.boolean(),
  substitutions: z.enum(["unlimited", "limited"]),
  sub_limit: z.number().int().min(1).max(15).optional(),
  players_per_side: z.number().int().min(5).max(11),
  points,
  tiebreakers: z.array(z.string()).min(1),
});

export type CricketRules = z.infer<typeof cricketRulesSchema>;
export type FootballRules = z.infer<typeof footballRulesSchema>;

export const CRICKET_OVERS: Record<string, number> = { t10: 10, t20: 20, odi: 50 };

export function defaultRules(sport: string): CricketRules | FootballRules {
  if (sport === "football") {
    return { format: "11", half_minutes: 45, extra_time: false, penalties: false, substitutions: "unlimited", players_per_side: 11, points: { win: 3, draw: 1, loss: 0 }, tiebreakers: ["goal_difference", "goals_for", "head_to_head", "fair_play"] };
  }
  return { match_format: "t20", overs: 20, overs_per_bowler: 4, ball_type: "Tennis ball", players_per_side: 11, powerplay: false, super_over: false, points: { win: 2, tie: 1, no_result: 1 }, tiebreakers: ["nrr", "head_to_head", "wins"] };
}

export function rulesSchemaFor(sport: string) {
  return sport === "football" ? footballRulesSchema : cricketRulesSchema;
}

/** Overs per bowler default: a fifth of the innings, rounded up. */
export function defaultOversPerBowler(overs: number) {
  return Math.max(1, Math.ceil(overs / 5));
}

/* ----- Step 4 ----- */
const slab = z.object({ from: z.number().int().min(0), to: z.number().int().min(1).nullable(), step: z.number().int().min(1) });

export function validateSlabs(slabs: Array<{ from: number; to: number | null; step: number }>): string | null {
  if (slabs.length === 0) return "Add at least one increment slab.";
  const sorted = [...slabs].sort((a, b) => a.from - b.from);
  if (sorted[0].from !== 0) return "The first slab must start at 0.";
  for (let i = 0; i < sorted.length; i++) {
    const s = sorted[i];
    if (s.to !== null && s.to <= s.from) return "Each slab must end after it starts.";
    if (i < sorted.length - 1 && s.to !== sorted[i + 1].from) return "Slabs must be continuous with no gaps or overlaps.";
    if (i === sorted.length - 1 && s.to !== null) return "The last slab must be open-ended (leave 'to' empty).";
  }
  return null;
}

export const auctionSchema = z.object({
  mode: z.enum(["live", "simple"]),
  purse: z.number().int().min(1, "Enter a purse."),
  categories: z.array(z.string().trim().min(1).max(30)).min(1, "Add at least one category.").max(12),
  basePrices: z.record(z.string(), z.number().int().min(0)),
  incrementSlabs: z.array(slab),
  reserveRule: z.boolean(),
  categoryLimits: z.record(z.string(), z.number().int().min(1)),
  sequenceMode: z.enum(["random", "category", "manual"]),
  scheduledAt: optionalDateTime,
});
export type AuctionInput = z.infer<typeof auctionSchema>;

export const squadSchema = z
  .object({
    squadMode: z.enum(["auction", "direct"]),
    squadMin: z.number().int().min(1, "Enter a minimum."),
    squadMax: z.number().int().max(25, "At most 25."),
    playerPoolCap: z.number().int().min(1).nullable().optional(),
    squadLockDeadline: optionalDateTime,
    allowPlayerApplications: z.boolean(),
  })
  .refine((v) => v.squadMax >= v.squadMin, { path: ["squadMax"], message: "Maximum can't be less than the minimum." });

/* ----- Step 5 ----- */
export const customQuestionSchema = z.object({ q: z.string().trim().min(3).max(120), required: z.boolean() });

export const registrationSchema = z
  .object({
    teamEntry: z.enum(["invite", "open", "both"]),
    teamDeadline: optionalDateTime,
    playerDeadline: optionalDateTime,
    customQuestions: z.array(customQuestionSchema).max(3, "Up to 3 questions."),
    visibility: z.enum(["public", "unlisted"]),
    showContact: z.boolean(),
    contactPhone: z.string().trim().max(20).optional().or(z.literal("")),
    contactEmail: z.string().trim().email("Enter a valid email.").max(200).optional().or(z.literal("")),
    entryFeeInfo: z.string().max(300).optional().or(z.literal("")),
  })
  .refine((v) => !v.showContact || v.contactPhone || v.contactEmail, { path: ["contactPhone"], message: "Add a phone or email to show." });

/* ----- Step 6 ----- */
export const AWARDS = ["Player of the tournament", "Best batter", "Best bowler", "Golden boot", "Best goalkeeper", "Fair play"] as const;

export const prizesSchema = z.object({
  prizePoolText: z.string().max(200).optional().or(z.literal("")),
  prizes: z.array(z.object({ position: z.string().trim().min(1).max(30), prize: z.string().trim().min(1).max(100) })).max(5, "Up to 5 prizes."),
  awards: z.array(z.string()),
  rulesText: z.string().max(6000, "Up to 6000 characters.").optional().or(z.literal("")),
  codeOfConduct: z.literal(true, { message: "Please accept the code of conduct." }),
});

/* ----- Step 7 ----- */
export const reviewSchema = z.object({ confirmed: z.literal(true, { message: "Please confirm the details and accept the Terms." }) });

export const STEP_SCHEMAS = { 1: basicsSchema, 2: formatSchema, 4: squadSchema, 5: registrationSchema, 6: prizesSchema, 7: reviewSchema } as const;
