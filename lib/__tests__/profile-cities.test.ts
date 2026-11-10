import { describe, expect, it } from "vitest";
import { ageFromDob, dobSchema, usernameSchema, onboardingSchema } from "../validation/profile";
import { nearestCitySlug } from "../cities";

describe("profile validation", () => {
  it("computes age", () => {
    expect(ageFromDob("2000-06-15", new Date("2026-06-14T00:00:00"))).toBe(25);
    expect(ageFromDob("2000-06-15", new Date("2026-06-15T00:00:00"))).toBe(26);
  });
  it("blocks under 13", () => {
    const y = new Date().getFullYear() - 10;
    expect(dobSchema.safeParse(`${y}-01-01`).success).toBe(false);
    expect(dobSchema.safeParse("2000-01-01").success).toBe(true);
  });
  it("username rules", () => {
    expect(usernameSchema.parse("Rudra_09")).toBe("rudra_09");
    expect(usernameSchema.safeParse("ab").success).toBe(false);
    expect(usernameSchema.safeParse("has space").success).toBe(false);
  });
  it("onboarding needs a city and an intent", () => {
    expect(onboardingSchema.safeParse({ cityId: "x", about: {}, intents: [] }).success).toBe(false);
  });
});

describe("nearest city", () => {
  const slugs = ["raipur", "bilaspur", "korba"];
  it("finds Bilaspur near its centre", () => {
    expect(nearestCitySlug({ lat: 22.09, lng: 82.14 }, slugs)).toBe("bilaspur");
  });
  it("returns null when far away", () => {
    expect(nearestCitySlug({ lat: 28.61, lng: 77.2 }, slugs)).toBeNull();
  });
});
