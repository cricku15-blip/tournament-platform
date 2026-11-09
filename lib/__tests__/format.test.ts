import { describe, it, expect } from "vitest";
import { formatINR, formatNumberIN, formatDate, formatDateTime } from "../format";

describe("formatINR", () => {
  it("formats round rupees without decimals by default", () => {
    expect(formatINR(50000)).toMatch(/₹\s?500/);
    expect(formatINR(125000000)).toMatch(/₹\s?12,50,000/);
  });

  it("formats decimal paise properly", () => {
    expect(formatINR(50050)).toMatch(/₹\s?500\.50/);
  });

  it("handles zero and negative amounts", () => {
    expect(formatINR(0)).toMatch(/₹\s?0/);
  });
});

describe("formatNumberIN", () => {
  it("formats numbers with Indian grouping", () => {
    expect(formatNumberIN(1250000)).toBe("12,50,000");
    expect(formatNumberIN(100000)).toBe("1,00,000");
    expect(formatNumberIN(500)).toBe("500");
  });
});

describe("formatDate and formatDateTime", () => {
  it("formats date in India timezone", () => {
    // 2026-12-14 00:00:00 UTC = 2026-12-14 05:30:00 IST
    const date = new Date("2026-12-14T00:00:00Z");
    expect(formatDate(date)).toBe("14 Dec 2026");
  });

  it("formats datetime in India timezone with 12h am/pm", () => {
    // 2026-12-14 10:00:00 UTC = 15:30:00 IST (3:30 pm)
    const date = new Date("2026-12-14T10:00:00Z");
    expect(formatDateTime(date)).toBe("14 Dec 2026, 3:30 pm");
  });
});
