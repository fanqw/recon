import { describe, expect, it } from "vitest";
import { buildMasterDataComboboxOptions } from "./combobox-options";

describe("buildMasterDataComboboxOptions", () => {
  it("query 为空时只返回后端 items", () => {
    const options = buildMasterDataComboboxOptions({
      items: [{ id: "1", name: "苹果" }],
      query: "   ",
    });

    expect(options).toEqual([
      {
        value: "id:1",
        label: "苹果",
        row: { id: "1", name: "苹果" },
      },
    ]);
  });

  it("无精确匹配时会在首位注入当前输入选项", () => {
    const options = buildMasterDataComboboxOptions({
      items: [{ id: "1", name: "苹果" }],
      query: " 梨 ",
    });

    expect(options).toEqual([
      {
        value: "free:梨",
        label: "梨",
        row: null,
      },
      {
        value: "id:1",
        label: "苹果",
        row: { id: "1", name: "苹果" },
      },
    ]);
  });

  it("精确匹配时不注入当前输入选项", () => {
    const options = buildMasterDataComboboxOptions({
      items: [{ id: "1", name: "  苹果  " }],
      query: "苹果",
    });

    expect(options).toEqual([
      {
        value: "id:1",
        label: "  苹果  ",
        row: { id: "1", name: "  苹果  " },
      },
    ]);
  });
});
