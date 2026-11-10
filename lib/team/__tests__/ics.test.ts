import { describe, expect, it } from "vitest";
import { buildIcs } from "../ics";

describe("buildIcs", () => {
  const now = new Date("2026-01-01T00:00:00Z");
  it("builds a valid calendar with escaped text", () => {
    const out = buildIcs("Raipur, League", [{ uid: "m1", start: "2026-03-01T10:30:00Z", durationMinutes: 120, summary: "A vs B; final", location: "Ground, Raipur" }], now);
    expect(out.startsWith("BEGIN:VCALENDAR\r\n")).toBe(true);
    expect(out).toContain("DTSTART:20260301T103000Z");
    expect(out).toContain("DTEND:20260301T123000Z");
    expect(out).toContain("SUMMARY:A vs B\; final");
    expect(out).toContain("LOCATION:Ground\\, Raipur");
    expect(out.trimEnd().endsWith("END:VCALENDAR")).toBe(true);
  });
  it("folds long lines", () => {
    const out = buildIcs("x", [{ uid: "m", start: "2026-03-01T10:30:00Z", durationMinutes: 60, summary: "S".repeat(200) }], now);
    expect(out.split("\r\n").every((l) => l.length <= 75)).toBe(true);
  });
  it("empty calendar is still valid", () => {
    expect(buildIcs("x", [], now)).toContain("END:VCALENDAR");
  });
});
