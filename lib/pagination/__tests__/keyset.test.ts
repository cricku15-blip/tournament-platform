import { describe, expect, it } from "vitest";
import { decodeCursor, encodeCursor, keysetFilter } from "../keyset";

describe("keyset cursor", () => {
  const c = { t: "2026-03-10T10:00:00.123456+00:00", id: "11111111-1111-1111-1111-111111111111" };
  it("round trips", () => {
    expect(decodeCursor(encodeCursor(c))).toEqual(c);
  });
  it("rejects garbage", () => {
    expect(decodeCursor("not-base64-json")).toBeNull();
    expect(decodeCursor(encodeCursor({ t: "x", id: "y" }))).toBeNull();
    expect(decodeCursor(null)).toBeNull();
  });
  it("builds an or filter", () => {
    expect(keysetFilter(c)).toContain("created_at.lt.");
    expect(keysetFilter(c)).toContain(`id.lt.${c.id}`);
  });
});
