import { describe, expect, it } from "vitest";
import { greeting } from "../greeting";

describe("greeting", () => {
  it("uses India time", () => {
    expect(greeting(new Date("2026-01-01T02:00:00Z"))).toBe("Good morning");
    expect(greeting(new Date("2026-01-01T08:00:00Z"))).toBe("Good afternoon");
    expect(greeting(new Date("2026-01-01T14:00:00Z"))).toBe("Good evening");
  });
});
