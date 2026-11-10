import { describe, expect, it } from "vitest";
import { normalisePrefs } from "../categories";

describe("normalisePrefs", () => {
  it("defaults everything on", () => {
    const p = normalisePrefs(undefined);
    expect(p.auction).toEqual({ inapp: true, email: true });
  });
  it("keeps user choices but never lets billing/security be turned off", () => {
    const p = normalisePrefs({ auction: { inapp: true, email: false }, billing: { inapp: false, email: false } });
    expect(p.auction.email).toBe(false);
    expect(p.billing).toEqual({ inapp: true, email: true });
  });
});
