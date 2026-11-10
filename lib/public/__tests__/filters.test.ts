import { describe, expect, it } from "vitest";
import { filtersToQuery, likePattern, parseFilters } from "../filters";

describe("tournament filters", () => {
  it("keeps valid params and drops invalid ones", () => {
    const f = parseFilters({ sport: "cricket", status: "nonsense", page: "3", q: " ipl ", city: "RAIPUR!" });
    expect(f).toEqual({ sport: "cricket", page: 3, q: "ipl" });
  });
  it("escapes like wildcards and separators", () => {
    expect(likePattern("50%_off,(x)")).toBe("%50\\%\\_off  x %");
  });
  it("round trips to a query string", () => {
    expect(filtersToQuery({ sport: "cricket" }, { page: 2 })).toBe("?sport=cricket&page=2");
    expect(filtersToQuery({})).toBe("");
  });
});
