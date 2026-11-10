import { describe, expect, it } from "vitest";
import { csvCell } from "../csv";

describe("csvCell", () => {
  it("quotes commas, quotes and newlines", () => {
    expect(csvCell('a,"b"')).toBe('"a,""b"""');
    expect(csvCell("x\ny")).toBe('"x\ny"');
    expect(csvCell(null)).toBe("");
    expect(csvCell(42)).toBe("42");
  });
  it("neutralises formula injection", () => {
    expect(csvCell("=HYPERLINK(1)")).toBe("'=HYPERLINK(1)");
    expect(csvCell("+1")).toBe("'+1");
    expect(csvCell("@a")).toBe("'@a");
  });
});
