import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "./password";

describe("password", () => {
  it("verifyPassword 对 hashPassword 结果返回 true", async () => {
    const hash = await hashPassword("secret");
    expect(await verifyPassword("secret", hash)).toBe(true);
  });

  it("错误密码返回 false", async () => {
    const hash = await hashPassword("secret");
    expect(await verifyPassword("wrong", hash)).toBe(false);
  });
});
