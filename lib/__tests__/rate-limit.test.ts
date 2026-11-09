import { describe, it, expect } from "vitest";
import { rateLimit, RATE_LIMIT_PRESETS } from "../rate-limit";

describe("rate limiter", () => {
  it("allows requests under the preset limit and blocks exceeding requests", async () => {
    const id = `user_test_${Date.now()}`;
    const config = { max: 3, windowSeconds: 10 };

    const res1 = await rateLimit(id, config);
    expect(res1.success).toBe(true);
    expect(res1.remaining).toBe(2);

    const res2 = await rateLimit(id, config);
    expect(res2.success).toBe(true);
    expect(res2.remaining).toBe(1);

    const res3 = await rateLimit(id, config);
    expect(res3.success).toBe(true);
    expect(res3.remaining).toBe(0);

    const res4 = await rateLimit(id, config);
    expect(res4.success).toBe(false);
    expect(res4.remaining).toBe(0);
  });

  it("has valid configurations for all required presets", () => {
    expect(RATE_LIMIT_PRESETS.auth.max).toBeGreaterThan(0);
    expect(RATE_LIMIT_PRESETS.contact.max).toBeGreaterThan(0);
    expect(RATE_LIMIT_PRESETS.search.max).toBeGreaterThan(0);
    expect(RATE_LIMIT_PRESETS.invite.max).toBeGreaterThan(0);
  });
});
