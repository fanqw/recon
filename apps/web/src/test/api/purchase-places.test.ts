import { describe, expect, inject, it } from "vitest";
import { fetchWithCookie, loginAsAdmin, postJsonWithCookie } from "../http-client";

describe("/api/purchase-places", () => {
  it("未带 Cookie 时 GET 返回 401", async () => {
    const baseUrl = inject("testBaseUrl");
    const res = await fetch(`${baseUrl}/api/purchase-places`);
    expect(res.status).toBe(401);
  });

  it("认证后可创建并在列表中查询到进货地", async () => {
    const baseUrl = inject("testBaseUrl");
    const cookie = await loginAsAdmin(baseUrl);
    const suffix = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    const place = `api-place-${suffix}`;
    const marketName = `api-market-${suffix}`;

    const createRes = await postJsonWithCookie(
      baseUrl,
      "/api/purchase-places",
      { place: `  ${place}  `, marketName, desc: "test" },
      cookie,
    );
    expect(createRes.status).toBe(201);
    const created = (await createRes.json()) as {
      item: { id: string; place: string; marketName: string; desc: string | null };
    };
    expect(created.item.id).toBeTruthy();
    expect(created.item.place).toBe(place);
    expect(created.item.marketName).toBe(marketName);

    const listRes = await fetchWithCookie(
      baseUrl,
      `/api/purchase-places?q=${encodeURIComponent(marketName)}`,
      {},
      cookie,
    );
    expect(listRes.status).toBe(200);
    const list = (await listRes.json()) as {
      items: Array<{ id: string; place: string; marketName: string }>;
    };
    expect(list.items.some((item) => item.id === created.item.id)).toBe(true);
  });

  it("重复 place + marketName 返回 409", async () => {
    const baseUrl = inject("testBaseUrl");
    const cookie = await loginAsAdmin(baseUrl);
    const suffix = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    const payload = {
      place: `dup-place-${suffix}`,
      marketName: `dup-market-${suffix}`,
    };

    const first = await postJsonWithCookie(
      baseUrl,
      "/api/purchase-places",
      payload,
      cookie,
    );
    expect(first.status).toBe(201);

    const duplicate = await postJsonWithCookie(
      baseUrl,
      "/api/purchase-places",
      payload,
      cookie,
    );
    expect(duplicate.status).toBe(409);
  });
});
