import { describe, expect, it } from "vitest";
import { dayLabel, extractMentions, muteMinutesUntil } from "../chat";

describe("chat helpers", () => {
  it("extracts distinct mentions only at word starts", () => {
    expect(extractMentions("hi @Ravi_01 and @ravi_01, mail me@x.com @ab @amit")).toEqual(["ravi_01", "amit"]);
  });
  it("caps mentions at 5", () => {
    expect(extractMentions("@aaa @bbb @ccc @ddd @eee @fff @ggg")).toHaveLength(5);
  });
  it("labels days in India time", () => {
    const now = new Date("2026-03-10T10:00:00Z");
    expect(dayLabel("2026-03-10T03:00:00Z", now)).toBe("Today");
    expect(dayLabel("2026-03-09T10:00:00Z", now)).toBe("Yesterday");
    expect(dayLabel("2026-01-02T10:00:00Z", now)).toContain("2026");
  });
  it("mute until end date stays within bounds", () => {
    const now = new Date("2026-03-10T10:00:00Z");
    expect(muteMinutesUntil(null, now)).toBe(43200);
    expect(muteMinutesUntil("2026-03-10", now)).toBeGreaterThanOrEqual(60);
    expect(muteMinutesUntil("2099-01-01", now)).toBe(60 * 24 * 90);
  });
});
