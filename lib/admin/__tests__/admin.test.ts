import { describe, expect, it } from "vitest";
import { validateTiers } from "../pricing";
import { validateSportConfig } from "../sport-config";

describe("validateTiers", () => {
  it("accepts contiguous tiers", () => {
    expect(validateTiers([{ id: "a", min: 3, max: 4 }, { id: "b", min: 5, max: 6 }, { id: "c", min: 7, max: 8 }])).toBeNull();
  });
  it("rejects overlaps and gaps", () => {
    expect(validateTiers([{ id: "a", min: 3, max: 5 }, { id: "b", min: 5, max: 8 }])).toMatch(/overlap/);
    expect(validateTiers([{ id: "a", min: 3, max: 4 }, { id: "b", min: 6, max: 8 }])).toMatch(/gap/);
  });
  it("rejects inverted ranges, empty sets and a first tier that starts too high", () => {
    expect(validateTiers([{ id: "a", min: 5, max: 4 }])).toMatch(/at least the minimum/);
    expect(validateTiers([])).toMatch(/At least one/);
    expect(validateTiers([{ id: "a", min: 5, max: 8 }])).toMatch(/first tier/);
  });
});

describe("validateSportConfig", () => {
  const ok = { squad: { players_per_side_default: 11, players_per_side_min: 6, players_per_side_max: 11, squad_max_limit: 25 }, roles: ["Batter"], profile_fields: [], points: { win: 2 } };
  it("accepts a valid config and keeps extra keys", () => {
    const r = validateSportConfig({ ...ok, ball_types: ["Tennis ball"] });
    expect(r.ok).toBe(true);
    if (r.ok) expect((r.config as Record<string, unknown>).ball_types).toBeDefined();
  });
  it("rejects bad squad ordering and missing roles", () => {
    expect(validateSportConfig({ ...ok, squad: { ...ok.squad, players_per_side_min: 12 } }).ok).toBe(false);
    expect(validateSportConfig({ ...ok, roles: [] }).ok).toBe(false);
    expect(validateSportConfig("nope").ok).toBe(false);
  });
});
