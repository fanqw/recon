import { describe, expect, it } from "vitest";
import {
  horizontalBarOption,
  pieOption,
  stackedBarOption,
  stackedTrendOption,
} from "@/components/analytics/workbench-options";

describe("stackedTrendOption", () => {
  it("renders the total trend as stacked bars with the shared palette", () => {
    const option = stackedTrendOption({
      labels: ["2026-04-20", "2026-04-21"],
      series: [
        { name: "武汉 / 白沙洲", values: [120, 80] },
        { name: "长沙 / 红星", values: [60, 90] },
      ],
    });

    expect(option.color).toEqual([
      "#2563EB",
      "#14B8A6",
      "#F59E0B",
      "#EF4444",
      "#8B5CF6",
      "#06B6D4",
      "#84CC16",
      "#F97316",
      "#64748B",
      "#EC4899",
    ]);
    expect(option.series).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: "bar", stack: "total-amount" }),
      ]),
    );
  });
});

describe("shared chart palette", () => {
  it("applies the same palette to ranking, stack, and share charts", () => {
    const palette = [
      "#2563EB",
      "#14B8A6",
      "#F59E0B",
      "#EF4444",
      "#8B5CF6",
      "#06B6D4",
      "#84CC16",
      "#F97316",
      "#64748B",
      "#EC4899",
    ];

    expect(horizontalBarOption("商品金额 Top 10", []).color).toEqual(palette);
    expect(stackedBarOption("分类金额与商品构成", { categories: [], series: [] }).color).toEqual(
      palette,
    );
    expect(pieOption("分类金额占比", []).color).toEqual(palette);
  });
});
