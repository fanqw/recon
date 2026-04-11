import { describe, expect, inject, it } from "vitest";
import {
  fetchWithCookie,
  loginAsAdmin,
  patchJsonWithCookie,
  postJsonWithCookie,
} from "../http-client";

function suffix(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

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

  it("q 可命中进货地、市场名称与描述，且按 updatedAt desc 排序", async () => {
    const baseUrl = inject("testBaseUrl");
    const cookie = await loginAsAdmin(baseUrl);
    const suf = suffix();
    const q = `purchase-place-search-${suf}`;

    const placeRes = await postJsonWithCookie(
      baseUrl,
      "/api/purchase-places",
      { place: `${q}-place`, marketName: `market-a-${suf}`, desc: "alpha" },
      cookie,
    );
    expect(placeRes.status).toBe(201);
    const placeItem = (await placeRes.json()) as { item: { id: string } };

    const marketRes = await postJsonWithCookie(
      baseUrl,
      "/api/purchase-places",
      { place: `place-b-${suf}`, marketName: `${q}-market`, desc: "beta" },
      cookie,
    );
    expect(marketRes.status).toBe(201);
    const marketItem = (await marketRes.json()) as { item: { id: string } };

    const descRes = await postJsonWithCookie(
      baseUrl,
      "/api/purchase-places",
      { place: `place-c-${suf}`, marketName: `market-c-${suf}`, desc: `gamma ${q}` },
      cookie,
    );
    expect(descRes.status).toBe(201);
    const descItem = (await descRes.json()) as { item: { id: string } };

    const bump = await patchJsonWithCookie(
      baseUrl,
      `/api/purchase-places/${marketItem.item.id}`,
      { desc: "beta-updated" },
      cookie,
    );
    expect(bump.status).toBe(200);

    const res = await fetchWithCookie(
      baseUrl,
      `/api/purchase-places?q=${encodeURIComponent(q)}`,
      {},
      cookie,
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as { items: Array<{ id: string }> };
    const ids = body.items.map((item) => item.id);
    expect(ids).toHaveLength(3);
    expect(ids[0]).toBe(marketItem.item.id);
    expect(ids).toEqual(
      expect.arrayContaining([
        marketItem.item.id,
        placeItem.item.id,
        descItem.item.id,
      ]),
    );
  });
});
