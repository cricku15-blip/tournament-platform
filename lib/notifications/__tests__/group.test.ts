import { describe, expect, it } from "vitest";
import { groupByDay } from "../group";

describe("groupByDay", () => {
  it("splits today and earlier in India time", () => {
    const now = new Date("2026-03-10T10:00:00Z");
    const r = groupByDay(
      [{ created_at: "2026-03-10T05:00:00Z" }, { created_at: "2026-03-09T05:00:00Z" }],
      now
    );
    expect(r.today).toHaveLength(1);
    expect(r.earlier).toHaveLength(1);
  });
});
