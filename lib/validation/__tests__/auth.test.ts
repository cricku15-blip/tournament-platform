import { describe, expect, it } from "vitest";
import { emailSchema, otpCodeSchema, safeNext } from "../auth";

describe("auth validation", () => {
  it("normalises and validates email", () => {
    expect(emailSchema.parse("  A@B.com ")).toBe("a@b.com");
    expect(emailSchema.safeParse("nope").success).toBe(false);
  });
  it("accepts only 6 digit codes", () => {
    expect(otpCodeSchema.safeParse("123456").success).toBe(true);
    expect(otpCodeSchema.safeParse("12345").success).toBe(false);
    expect(otpCodeSchema.safeParse("12345a").success).toBe(false);
  });
  it("blocks open redirects", () => {
    expect(safeNext("/tournaments/1")).toBe("/tournaments/1");
    expect(safeNext("//evil.com")).toBe("/dashboard");
    expect(safeNext("https://evil.com")).toBe("/dashboard");
    expect(safeNext(null)).toBe("/dashboard");
  });
});
