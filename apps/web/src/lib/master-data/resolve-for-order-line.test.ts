import { describe, expect, it } from "vitest";
import { trimName } from "./resolve-for-order-line";

describe("trimName", () => {
  it("去除首尾空白", () => {
    expect(trimName("  水果  ")).toBe("水果");
  });
});
