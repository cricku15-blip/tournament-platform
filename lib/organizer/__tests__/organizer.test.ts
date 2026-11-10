import { describe, expect, it } from "vitest";
import { countMatches } from "../match-count";
import { basicsSchema, cricketRulesSchema, defaultOversPerBowler, defaultRules, footballRulesSchema, registrationSchema, slugify, squadSchema, validateSlabs, prizesSchema } from "../schemas";

describe("countMatches", () => {
  it("round robin", () => {
    expect(countMatches({ format: "league", teams: 6, legs: 2 }).total).toBe(30);
    expect(countMatches({ format: "league", teams: 4, legs: 1 }).total).toBe(6);
  });
  it("knockout with and without third place", () => {
    expect(countMatches({ format: "knockout", teams: 8, legs: 1 }).total).toBe(7);
    expect(countMatches({ format: "knockout", teams: 8, legs: 1, thirdPlace: true }).total).toBe(8);
  });
  it("league then playoffs", () => {
    expect(countMatches({ format: "league_playoffs", teams: 6, legs: 1, playoffStyle: "top4_semis" }).total).toBe(18);
    expect(countMatches({ format: "league_playoffs", teams: 6, legs: 1, playoffStyle: "top2_final" }).total).toBe(16);
    expect(countMatches({ format: "league_playoffs", teams: 6, legs: 1, playoffStyle: "qualifier_style" }).total).toBe(19);
  });
});

describe("schemas", () => {
  const uuid = "11111111-1111-4111-8111-111111111111";
  const base = { name: "Raipur Premier League", slug: "rpl", sportId: uuid, cityId: uuid, venueName: "Central Ground", startDate: "2999-01-01", endDate: "2999-01-10", descriptionShort: "A friendly local T20 tournament for all." };
  it("slugify", () => {
    expect(slugify("  Raipur Premier League 2026!! ")).toBe("raipur-premier-league-2026");
  });
  it("basics accepts valid and rejects bad dates", () => {
    expect(basicsSchema.safeParse(base).success).toBe(true);
    expect(basicsSchema.safeParse({ ...base, endDate: "2998-12-31" }).success).toBe(false);
    expect(basicsSchema.safeParse({ ...base, startDate: "2000-01-01" }).success).toBe(false);
  });
  it("squad max not below min", () => {
    expect(squadSchema.safeParse({ squadMode: "direct", squadMin: 11, squadMax: 10, allowPlayerApplications: true }).success).toBe(false);
    expect(squadSchema.safeParse({ squadMode: "direct", squadMin: 11, squadMax: 26, allowPlayerApplications: true }).success).toBe(false);
  });
  it("default rules validate", () => {
    expect(cricketRulesSchema.safeParse(defaultRules("cricket")).success).toBe(true);
    expect(footballRulesSchema.safeParse(defaultRules("football")).success).toBe(true);
    expect(defaultOversPerBowler(20)).toBe(4);
  });
  it("registration needs contact when shown and max 3 questions", () => {
    const r = { teamEntry: "invite", customQuestions: [], visibility: "public", showContact: true };
    expect(registrationSchema.safeParse(r).success).toBe(false);
    expect(registrationSchema.safeParse({ ...r, contactEmail: "a@b.com" }).success).toBe(true);
    const q = { q: "Your jersey size?", required: false };
    expect(registrationSchema.safeParse({ ...r, showContact: false, customQuestions: [q, q, q, q] }).success).toBe(false);
  });
  it("prizes need code of conduct", () => {
    expect(prizesSchema.safeParse({ prizes: [], awards: [], codeOfConduct: false }).success).toBe(false);
    expect(prizesSchema.safeParse({ prizes: [], awards: [], codeOfConduct: true }).success).toBe(true);
  });
  it("increment slabs must be continuous and end open", () => {
    expect(validateSlabs([{ from: 0, to: 100, step: 5 }, { from: 100, to: null, step: 10 }])).toBeNull();
    expect(validateSlabs([{ from: 0, to: 100, step: 5 }, { from: 150, to: null, step: 10 }])).toMatch(/continuous/);
    expect(validateSlabs([{ from: 0, to: 100, step: 5 }])).toMatch(/open-ended/);
    expect(validateSlabs([{ from: 10, to: null, step: 5 }])).toMatch(/start at 0/);
  });
});
