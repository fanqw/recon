import { describe, expect, inject, it } from "vitest";
import {
  cookieHeaderFromResponse,
  fetchWithCookie,
  loginAsAdmin,
  postJsonWithCookie,
} from "../http-client";

describe("POST /api/auth/logout", () => {
  it("登出后按响应 Set-Cookie 更新会话，再访问受保护 API 返回 401", async () => {
    const baseUrl = inject("testBaseUrl");
    const cookie = await loginAsAdmin(baseUrl);

    const authed = await fetchWithCookie(baseUrl, "/api/categories", {}, cookie);
    expect(authed.status).toBe(200);

    const logoutRes = await postJsonWithCookie(
      baseUrl,
      "/api/auth/logout",
      {},
      cookie
    );
    expect(logoutRes.ok).toBe(true);

    /** 模拟浏览器：采用登出响应中的会话 Cookie（清空后的值）。 */
    const cleared = cookieHeaderFromResponse(logoutRes);
    expect(cleared.length).toBeGreaterThan(0);

    const after = await fetchWithCookie(baseUrl, "/api/categories", {}, cleared);
    expect(after.status).toBe(401);
  });
});
