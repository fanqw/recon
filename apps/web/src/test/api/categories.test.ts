import { describe, expect, inject, it } from "vitest";
import { fetchWithCookie, loginAsAdmin } from "../http-client";

describe("GET /api/categories", () => {
  it("未带 Cookie 时返回 401", async () => {
    const baseUrl = inject("testBaseUrl");
    const res = await fetch(`${baseUrl}/api/categories`);
    expect(res.status).toBe(401);
  });

  it("带登录 Cookie 时返回 200 且 items 为数组", async () => {
    const baseUrl = inject("testBaseUrl");
    const cookie = await loginAsAdmin(baseUrl);
    const res = await fetchWithCookie(baseUrl, "/api/categories", {}, cookie);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { items?: unknown };
    expect(Array.isArray(body.items)).toBe(true);
  });
});
