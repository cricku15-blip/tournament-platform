import { describe, it, expect } from "vitest";
import { getErrorMessage, DEFAULT_ERROR_MESSAGE, ERROR_MESSAGES } from "../errors";
import { rpc } from "../rpc";

describe("errors mapping", () => {
  const sampleCodes = [
    "not_authenticated",
    "profile_incomplete",
    "registration_closed",
    "city_mismatch",
    "subscription_required",
    "already_applied",
    "payment_required",
    "squad_full",
    "insufficient_purse",
    "reserve_rule",
    "bid_changed",
    "slow_mode",
  ];

  it("maps at least 10 sample error codes to non-default friendly messages", () => {
    expect(sampleCodes.length).toBeGreaterThanOrEqual(10);
    for (const code of sampleCodes) {
      const message = getErrorMessage(code);
      expect(message).toBeDefined();
      expect(message).not.toBe(DEFAULT_ERROR_MESSAGE);
      expect(message).toBe(ERROR_MESSAGES[code]);
    }
  });

  it("handles locked_field error prefix properly", () => {
    const message = getErrorMessage("locked_field: team_count");
    expect(message).toBe("This field cannot be changed after payment or publishing.");
  });

  it("falls back safely for unknown error codes", () => {
    const message = getErrorMessage("totally_unknown_custom_error_xyz");
    expect(message).toBe(DEFAULT_ERROR_MESSAGE);
  });
});

describe("rpc wrapper", () => {
  it("translates database errors into { code, message } object", async () => {
    const mockClient = {
      rpc: async () => ({
        data: null,
        error: { message: "city_mismatch" },
      }),
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await rpc("change_city" as any, { p_city_id: "test" } as any, mockClient as any);

    expect(result.data).toBeNull();
    expect(result.error).toEqual({
      code: "city_mismatch",
      message: "This tournament is in a different city than your profile city.",
    });
  });

  it("returns success data on successful rpc call", async () => {
    const mockClient = {
      rpc: async () => ({
        data: { success: true },
        error: null,
      }),
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await rpc("change_city" as any, { p_city_id: "test" } as any, mockClient as any);

    expect(result.error).toBeNull();
    expect(result.data).toEqual({ success: true });
  });
});
