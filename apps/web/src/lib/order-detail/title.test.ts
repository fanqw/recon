import { describe, expect, it } from "vitest";
import { buildOrderDetailTableTitle } from "./title";

describe("buildOrderDetailTableTitle", () => {
  it("uses date from production remark and purchase place for the table title", () => {
    expect(
      buildOrderDetailTableTitle({
        name: "20250227160000",
        desc: "幸福城 25.2.27 洛阳",
        createdAt: "2025-02-26T08:00:00.000Z",
        purchasePlace: { place: "洛阳", marketName: "幸福城" },
      }),
    ).toBe("2025年2月27日洛阳");
  });

  it("falls back to the order name date and market name when place is generic", () => {
    expect(
      buildOrderDetailTableTitle({
        name: "20250220210207",
        desc: "",
        createdAt: "2025-02-19T08:00:00.000Z",
        purchasePlace: { place: "历史导入", marketName: "晋城" },
      }),
    ).toBe("2025年2月20日晋城");
  });
});
