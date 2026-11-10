import { describe, expect, it } from "vitest";
import { withTax } from "../tax";
import { pollUntil } from "../poll";
import { applyEligibility, subscriptionView } from "../eligibility";

describe("withTax", () => {
  it("adds tax on top (exclusive)", () => {
    expect(withTax(100000, 18, false)).toEqual({ amount: 100000, tax: 18000, total: 118000 });
  });
  it("splits tax out of the price (inclusive)", () => {
    expect(withTax(118000, 18, true)).toEqual({ amount: 100000, tax: 18000, total: 118000 });
  });
  it("zero tax", () => {
    expect(withTax(50000, 0, false).total).toBe(50000);
  });
  it("stays integer", () => {
    const r = withTax(9901, 18, false);
    expect(Number.isInteger(r.tax) && Number.isInteger(r.total)).toBe(true);
    expect(r.amount + r.tax).toBe(r.total);
  });
});

describe("pollUntil", () => {
  it("resolves done when check passes", async () => {
    let n = 0;
    let t = 0;
    const r = await pollUntil({ check: async () => ++n >= 3, sleep: async (ms) => { t += ms; }, now: () => t });
    expect(r).toBe("done");
    expect(n).toBe(3);
  });
  it("times out as pending, not failure, and backs off after 20 s", async () => {
    let t = 0;
    const waits: number[] = [];
    const r = await pollUntil({ check: async () => false, sleep: async (ms) => { waits.push(ms); t += ms; }, now: () => t });
    expect(r).toBe("pending");
    expect(waits[0]).toBe(2000);
    expect(Math.max(...waits)).toBeGreaterThan(2000);
    expect(t).toBeGreaterThanOrEqual(60000);
  });
  it("keeps going when a status read throws", async () => {
    let n = 0;
    let t = 0;
    const r = await pollUntil({ check: async () => { if (++n < 2) throw new Error("net"); return true; }, sleep: async (ms) => { t += ms; }, now: () => t });
    expect(r).toBe("done");
  });
});

describe("eligibility", () => {
  const ok = { loggedIn: true, status: "registration_open", allowApplications: true, deadline: null, cityMatch: true, subscribed: true, alreadyApplied: false };
  it("ok", () => expect(applyEligibility(ok)).toEqual({ canApply: true, reason: "ok" }));
  it("reasons in priority order", () => {
    expect(applyEligibility({ ...ok, loggedIn: false }).reason).toBe("not_logged_in");
    expect(applyEligibility({ ...ok, status: "live" }).reason).toBe("registration_closed");
    expect(applyEligibility({ ...ok, deadline: "2000-01-01T00:00:00Z" }).reason).toBe("registration_closed");
    expect(applyEligibility({ ...ok, alreadyApplied: true }).reason).toBe("already_applied");
    expect(applyEligibility({ ...ok, cityMatch: false }).reason).toBe("city_mismatch");
    expect(applyEligibility({ ...ok, subscribed: false }).reason).toBe("subscription_required");
  });
});

describe("subscriptionView", () => {
  const future = new Date(Date.now() + 86400000).toISOString();
  const past = new Date(Date.now() - 86400000).toISOString();
  it("maps states", () => {
    expect(subscriptionView(null)).toBe("none");
    expect(subscriptionView({ status: "active", cancel_at_period_end: false, current_period_end: future, grace_until: null })).toBe("active");
    expect(subscriptionView({ status: "active", cancel_at_period_end: true, current_period_end: future, grace_until: null })).toBe("cancelling");
    expect(subscriptionView({ status: "cancelled", cancel_at_period_end: true, current_period_end: future, grace_until: null })).toBe("cancelling");
    expect(subscriptionView({ status: "cancelled", cancel_at_period_end: true, current_period_end: past, grace_until: null })).toBe("expired");
    expect(subscriptionView({ status: "past_due", cancel_at_period_end: false, current_period_end: past, grace_until: future })).toBe("past_due");
  });
});
