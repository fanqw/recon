import { describe, expect, it } from "vitest";
import {
  DELETE_BLOCK_CODES,
  isDeleteBlockCode,
  messageForDeleteBlockCode,
} from "./delete-block-codes";

describe("delete-block-codes", () => {
  it("能识别合法错误码", () => {
    expect(isDeleteBlockCode("CATEGORY_IN_USE")).toBe(true);
    expect(isDeleteBlockCode("PURCHASE_PLACE_IN_USE")).toBe(true);
    expect(isDeleteBlockCode("X")).toBe(false);
  });

  it("每个错误码都有中文提示文案", () => {
    for (const code of DELETE_BLOCK_CODES) {
      const msg = messageForDeleteBlockCode(code);
      expect(msg.length).toBeGreaterThan(0);
      expect(msg).toContain("无法删除");
    }
  });
});
