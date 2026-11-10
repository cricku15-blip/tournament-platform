import { describe, expect, it } from "vitest";
import { ballsToOvers, checkCricket, checkFootball, economy, nrrBalls, oversToBalls, strikeRate, suggestCricket, suggestFootball } from "../logic";

const names = { a: "Strikers", b: "Kings" };

describe("overs and rates", () => {
  it("converts overs to balls and back", () => {
    expect(oversToBalls("13.4")).toBe(82);
    expect(oversToBalls(20)).toBe(120);
    expect(oversToBalls("13.7")).toBeNull();
    expect(oversToBalls("abc")).toBeNull();
    expect(ballsToOvers(82)).toBe("13.4");
  });
  it("computes strike rate and economy", () => {
    expect(strikeRate(50, 40)).toBe(125);
    expect(strikeRate(0, 0)).toBe(0);
    expect(economy(30, 24)).toBe(7.5);
  });
});

describe("nrrBalls", () => {
  it("uses the full quota when all out", () => {
    expect(nrrBalls({ wickets: 10, balls: 100, overs: 20, playersPerSide: 11 })).toBe(120);
    expect(nrrBalls({ wickets: 4, balls: 120, overs: 20, playersPerSide: 11 })).toBe(120);
    expect(nrrBalls({ wickets: 5, balls: 90, overs: 20, playersPerSide: 11 })).toBe(90);
  });
});

describe("suggestCricket", () => {
  const base = { names, playersPerSide: 11 };
  it("chasing side wins by wickets", () => {
    const r = suggestCricket({ ...base, battedFirst: "a", a: { runs: 150, wickets: 8, balls: 120 }, b: { runs: 151, wickets: 3, balls: 100 } });
    expect(r).toEqual({ resultType: "win", winner: "b", text: "Kings won by 7 wickets" });
  });
  it("first side wins by runs", () => {
    const r = suggestCricket({ ...base, battedFirst: "b", a: { runs: 120, wickets: 10, balls: 110 }, b: { runs: 150, wickets: 5, balls: 120 } });
    expect(r.winner).toBe("b");
    expect(r.text).toBe("Kings won by 30 runs");
  });
  it("tie", () => {
    expect(suggestCricket({ ...base, battedFirst: "a", a: { runs: 100, wickets: 5, balls: 120 }, b: { runs: 100, wickets: 9, balls: 120 } }).resultType).toBe("tie");
  });
});

describe("suggestFootball", () => {
  it("win, penalties and draw", () => {
    expect(suggestFootball({ names, a: { goals: 2 }, b: { goals: 1 } }).winner).toBe("a");
    expect(suggestFootball({ names, a: { goals: 1, pens: 3 }, b: { goals: 1, pens: 4 } }).text).toContain("penalties");
    expect(suggestFootball({ names, a: { goals: 1 }, b: { goals: 1 } }).resultType).toBe("tie");
  });
});

describe("completeness checks", () => {
  it("flags cricket totals that do not add up", () => {
    const w = checkCricket({
      battedFirst: "a",
      totals: { a: { runs: 100, wickets: 2, extras: 5 }, b: { runs: 90, wickets: 3, extras: 0 } },
      batting: [{ innings: 1, runs: 55, dismissal: "Bowled" }, { innings: 1, runs: 40, dismissal: "Caught" }],
      bowling: [{ innings: 1, wickets: 2, runs: 100 }],
    });
    expect(w.some((x) => x.includes("Innings 1: batters"))).toBe(false);
    expect(w.some((x) => x.includes("Innings 2: no batting"))).toBe(true);
    const bad = checkCricket({ battedFirst: "a", totals: { a: { runs: 120, wickets: 1, extras: 5 }, b: { runs: 0, wickets: 0, extras: 0 } }, batting: [{ innings: 1, runs: 50, dismissal: "Bowled" }], bowling: [] });
    expect(bad[0]).toContain("make 55");
  });
  it("flags football goals vs events", () => {
    const w = checkFootball({ goals: { a: 2, b: 0 }, events: [{ type: "goal", team: "a" }], lineupsA: 5, lineupsB: 5 });
    expect(w).toHaveLength(1);
    expect(checkFootball({ goals: { a: 1, b: 0 }, events: [{ type: "own_goal", team: "b" }], lineupsA: 1, lineupsB: 1 })).toHaveLength(0);
    expect(checkFootball({ goals: { a: 0, b: 0 }, events: [], lineupsA: 0, lineupsB: 0 })[0]).toContain("lineups");
  });
});
