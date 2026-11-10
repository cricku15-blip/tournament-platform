/**
 * Rate Limiter
 *
 * Choice & Architecture:
 * - Uses Upstash Redis (REST API) when UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN are set.
 * - Falls back to an in-memory sliding window cache for local development and test environments.
 * - Designed for serverless/edge environments with zero cold-start penalty.
 */

export interface RateLimitConfig {
  max: number; // Maximum allowed requests
  windowSeconds: number; // Time window in seconds
}

export const RATE_LIMIT_PRESETS: Record<
  "auth" | "contact" | "search" | "invite",
  RateLimitConfig
> = {
  // Login / OTP / email send attempts: 5 per minute
  auth: { max: 5, windowSeconds: 60 },
  // Contact form submissions: 3 per 5 minutes
  contact: { max: 3, windowSeconds: 300 },
  // Tournament / player searches: 30 per minute
  search: { max: 30, windowSeconds: 60 },
  // Invite acceptance / generation: 10 per minute
  invite: { max: 10, windowSeconds: 60 },
};

export type RateLimitPreset = keyof typeof RATE_LIMIT_PRESETS;

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number; // Unix timestamp in seconds when the window resets
}

// In-memory sliding window cache (for local dev and test environments)
const memoryStore = new Map<string, { count: number; expiresAt: number }>();

export async function rateLimit(
  identifier: string,
  presetOrConfig: RateLimitPreset | RateLimitConfig
): Promise<RateLimitResult> {
  const config =
    typeof presetOrConfig === "string"
      ? RATE_LIMIT_PRESETS[presetOrConfig]
      : presetOrConfig;

  const now = Math.floor(Date.now() / 1000);
  const upstashUrl = process.env.UPSTASH_REDIS_REST_URL;
  const upstashToken = process.env.UPSTASH_REDIS_REST_TOKEN;

  // Use Upstash Redis if configured
  if (upstashUrl && upstashToken) {
    try {
      const key = `rate_limit:${identifier}`;
      const response = await fetch(`${upstashUrl}/pipeline`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${upstashToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify([
          ["INCR", key],
          ["EXPIRE", key, config.windowSeconds, "NX"],
        ]),
      });

      if (response.ok) {
        const results = await response.json();
        const currentCount = results[0]?.result || 1;
        const remaining = Math.max(0, config.max - currentCount);

        return {
          success: currentCount <= config.max,
          limit: config.max,
          remaining,
          reset: now + config.windowSeconds,
        };
      }
    } catch (err) {
      console.warn("[RateLimit] Upstash request failed, falling back to memory:", err);
    }
  }

  // Fallback in-memory rate limiting
  const key = `${identifier}:${config.windowSeconds}`;
  const existing = memoryStore.get(key);

  if (!existing || existing.expiresAt <= now) {
    const expiresAt = now + config.windowSeconds;
    memoryStore.set(key, { count: 1, expiresAt });
    return {
      success: true,
      limit: config.max,
      remaining: config.max - 1,
      reset: expiresAt,
    };
  }

  existing.count += 1;
  const remaining = Math.max(0, config.max - existing.count);

  return {
    success: existing.count <= config.max,
    limit: config.max,
    remaining,
    reset: existing.expiresAt,
  };
}
