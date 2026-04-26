import { describe, expect, it } from "vitest";
import {
  calculateEditableLineTotal,
  calculateEditableUnitPrice,
  hasManualLineTotalOverride,
} from "./line-total";

describe("calculateEditableLineTotal", () => {
  it("rounds quantity multiplied by price to at most two decimals", () => {
    expect(calculateEditableLineTotal(3, 10.555)).toBe(31.67);
    expect(calculateEditableLineTotal(2, 3)).toBe(6);
  });
});

describe("calculateEditableUnitPrice", () => {
  it("rounds manually edited line total divided by quantity to at most two decimals", () => {
    expect(calculateEditableUnitPrice(10, 50)).toBe(5);
    expect(calculateEditableUnitPrice(3, 10)).toBe(3.33);
    expect(calculateEditableUnitPrice(10, -50)).toBe(-5);
  });

  it("returns zero for invalid quantity", () => {
    expect(calculateEditableUnitPrice(0, 10)).toBe(0);
    expect(calculateEditableUnitPrice(Number.NaN, 10)).toBe(0);
  });

  it("supports negative quantities for adjustment lines", () => {
    expect(calculateEditableUnitPrice(-2, -30)).toBe(15);
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
