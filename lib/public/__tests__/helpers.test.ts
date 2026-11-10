import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({ notFound: () => { throw new Error("404"); }, permanentRedirect: () => { throw new Error("redirect"); } }));
vi.mock("../queries", () => ({ getTournamentBySlug: vi.fn() }));

import { toLines } from "../page-helpers";
import { bracketColumns } from "@/components/domain/public/knockout-bracket";

describe("toLines", () => {
  it("handles strings, arrays and objects", () => {
    expect(toLines("Trophy")).toEqual(["Trophy"]);
    expect(toLines(["A", { place: "1st", prize: "5000" }])).toEqual(["A", "place: 1st", "prize: 5000"]);
    expect(toLines(null)).toEqual([]);
  });
});

describe("bracketColumns", () => {
  it("orders rounds by distance from the final", () => {
    const cols = bracketColumns([
      { id: "f", next_match_id: null },
      { id: "s1", next_match_id: "f" },
      { id: "s2", next_match_id: "f" },
      { id: "q1", next_match_id: "s1" },
    ]);
    expect(cols.map((c) => c.map((m) => m.id))).toEqual([["q1"], ["s1", "s2"], ["f"]]);
  });
});
