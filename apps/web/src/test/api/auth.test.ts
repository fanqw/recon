import { describe, expect, inject, it } from "vitest";
import { cookieHeaderFromResponse } from "../http-client";

describe("POST /api/auth/login", () => {
  it("错误密码返回 401", async () => {
    const baseUrl = inject("testBaseUrl");
    const res = await fetch(`${baseUrl}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: "admin", password: "wrong-password" }),
    });
    expect(res.status).toBe(401);
  });

  it("正确密码返回 200 且 Set-Cookie 存在", async () => {
    const baseUrl = inject("testBaseUrl");
    const res = await fetch(`${baseUrl}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: "admin", password: "admin123" }),
    });
    expect(res.status).toBe(200);
    const cookie = cookieHeaderFromResponse(res);
    expect(cookie.length).toBeGreaterThan(0);
  });
});
