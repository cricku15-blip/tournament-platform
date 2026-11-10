import { describe, expect, it } from "vitest";
import { oversFromBalls, statusVariant } from "../labels";

describe("labels", () => {
  it("formats overs from balls", () => {
    expect(oversFromBalls(120)).toBe("20.0");
    expect(oversFromBalls(83)).toBe("13.5");
  });
  it("maps status to badge variant", () => {
    expect(statusVariant("live")).toBe("live");
    expect(statusVariant("squads_locked")).toBe("neutral");
  });
});
