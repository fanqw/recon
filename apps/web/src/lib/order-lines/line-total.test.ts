import { describe, expect, it } from "vitest";
import {
  calculateEditableLineTotal,
  hasManualLineTotalOverride,
} from "./line-total";

describe("calculateEditableLineTotal", () => {
  it("rounds quantity multiplied by price to at most two decimals", () => {
    expect(calculateEditableLineTotal(3, 10.555)).toBe(31.67);
    expect(calculateEditableLineTotal(2, 3)).toBe(6);
  });
});

describe("hasManualLineTotalOverride", () => {
  it("returns true when persisted line total differs from the calculated baseline", () => {
    expect(hasManualLineTotalOverride(20, 3.6, 80)).toBe(true);
  });

  it("returns false when persisted line total matches the calculated baseline", () => {
    expect(hasManualLineTotalOverride(20, 3.6, 72)).toBe(false);
  });
});
