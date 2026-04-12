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

async function createCategory(
  baseUrl: string,
  cookie: string,
  name: string,
  desc?: string,
): Promise<string> {
  const res = await postJsonWithCookie(
    baseUrl,
    "/api/categories",
    desc === undefined ? { name } : { name, desc },
    cookie,
  );
  expect(res.status).toBe(201);
  const body = (await res.json()) as { item: { id: string } };
  return body.item.id;
}

async function createUnit(
  baseUrl: string,
  cookie: string,
  name: string,
  desc?: string,
): Promise<string> {
  const res = await postJsonWithCookie(
    baseUrl,
    "/api/units",
    desc === undefined ? { name } : { name, desc },
    cookie,
  );
  expect(res.status).toBe(201);
  const body = (await res.json()) as { item: { id: string } };
  return body.item.id;
}

async function createPurchasePlace(
  baseUrl: string,
  cookie: string,
  place: string,
  marketName: string,
  desc?: string,
): Promise<string> {
  const res = await postJsonWithCookie(
    baseUrl,
    "/api/purchase-places",
    desc === undefined ? { place, marketName } : { place, marketName, desc },
    cookie,
  );
  expect(res.status).toBe(201);
  const body = (await res.json()) as { item: { id: string } };
  return body.item.id;
}

describe("GET /api/commodities", () => {
  it("q 可命中商品名称、分类名称、单位名称与描述，且按 updatedAt desc 排序", async () => {
    const baseUrl = inject("testBaseUrl");
    const cookie = await loginAsAdmin(baseUrl);
    const suf = suffix();
    const q = `commodity-search-${suf}`;

    const catNameId = await createCategory(baseUrl, cookie, `${q}-category`, "alpha");
    const catOtherId = await createCategory(baseUrl, cookie, `commodity-cat-${suf}`);
    const unitNameId = await createUnit(baseUrl, cookie, `${q}-unit`, "beta");
    const unitOtherId = await createUnit(baseUrl, cookie, `commodity-unit-${suf}`);

    const nameRes = await postJsonWithCookie(
      baseUrl,
      "/api/commodities",
      {
        name: `${q}-name`,
        categoryId: catOtherId,
        unitId: unitOtherId,
      },
      cookie,
    );
    expect(nameRes.status).toBe(201);
    const nameItem = (await nameRes.json()) as { item: { id: string } };

    const categoryRes = await postJsonWithCookie(
      baseUrl,
      "/api/commodities",
      {
        name: `commodity-by-category-${suf}`,
        categoryId: catNameId,
        unitId: unitOtherId,
      },
      cookie,
    );
    expect(categoryRes.status).toBe(201);
    const categoryItem = (await categoryRes.json()) as { item: { id: string } };

    const unitRes = await postJsonWithCookie(
      baseUrl,
      "/api/commodities",
      {
        name: `commodity-by-unit-${suf}`,
        categoryId: catOtherId,
        unitId: unitNameId,
      },
      cookie,
    );
    expect(unitRes.status).toBe(201);
    const unitItem = (await unitRes.json()) as { item: { id: string } };

    const descRes = await postJsonWithCookie(
      baseUrl,
      "/api/commodities",
      {
        name: `commodity-by-desc-${suf}`,
        categoryId: catOtherId,
        unitId: unitOtherId,
        desc: `gamma ${q}`,
      },
      cookie,
    );
    expect(descRes.status).toBe(201);
    const descItem = (await descRes.json()) as { item: { id: string } };

    const bump = await patchJsonWithCookie(
      baseUrl,
      `/api/commodities/${nameItem.item.id}`,
      { desc: "name-updated" },
      cookie,
    );
    expect(bump.status).toBe(200);

    const res = await fetchWithCookie(
      baseUrl,
      `/api/commodities?q=${encodeURIComponent(q)}`,
      {},
      cookie,
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as { items: Array<{ id: string }> };
    const ids = body.items.map((item) => item.id);
    expect(ids).toHaveLength(4);
    expect(ids[0]).toBe(nameItem.item.id);
    expect(ids).toEqual(
      expect.arrayContaining([
        nameItem.item.id,
        categoryItem.item.id,
        unitItem.item.id,
        descItem.item.id,
      ]),
    );
  });
});

describe("GET /api/orders", () => {
  it("q 可命中订单名称、进货地名称、市场名称与描述，且按 updatedAt desc 排序", async () => {
    const baseUrl = inject("testBaseUrl");
    const cookie = await loginAsAdmin(baseUrl);
    const suf = suffix();
    const q = `order-search-${suf}`;

    const placeNameId = await createPurchasePlace(
      baseUrl,
      cookie,
      `${q}-place`,
      `market-a-${suf}`,
      "alpha",
    );
    const placeMarketId = await createPurchasePlace(
      baseUrl,
      cookie,
      `place-b-${suf}`,
      `${q}-market`,
      "beta",
    );
    const placeDescId = await createPurchasePlace(
      baseUrl,
      cookie,
      `place-c-${suf}`,
      `market-c-${suf}`,
      `gamma ${q}`,
    );
    const placeOtherId = await createPurchasePlace(
      baseUrl,
      cookie,
      `place-d-${suf}`,
      `market-d-${suf}`,
    );

    const nameRes = await postJsonWithCookie(
      baseUrl,
      "/api/orders",
      { name: `${q}-name`, purchasePlaceId: placeOtherId },
      cookie,
    );
    expect(nameRes.status).toBe(201);
    const nameItem = (await nameRes.json()) as { item: { id: string } };

    const placeRes = await postJsonWithCookie(
      baseUrl,
      "/api/orders",
      { name: `order-by-place-${suf}`, purchasePlaceId: placeNameId },
      cookie,
    );
    expect(placeRes.status).toBe(201);
    const placeItem = (await placeRes.json()) as { item: { id: string } };

    const marketRes = await postJsonWithCookie(
      baseUrl,
      "/api/orders",
      { name: `order-by-market-${suf}`, purchasePlaceId: placeMarketId },
      cookie,
    );
    expect(marketRes.status).toBe(201);
    const marketItem = (await marketRes.json()) as { item: { id: string } };

    const descRes = await postJsonWithCookie(
      baseUrl,
      "/api/orders",
      { name: `order-by-desc-${suf}`, purchasePlaceId: placeDescId, desc: `delta ${q}` },
      cookie,
    );
    expect(descRes.status).toBe(201);
    const descItem = (await descRes.json()) as { item: { id: string } };

    const bump = await patchJsonWithCookie(
      baseUrl,
      `/api/orders/${nameItem.item.id}`,
      { desc: "name-updated", purchasePlaceId: placeOtherId },
      cookie,
    );
    expect(bump.status).toBe(200);

    const res = await fetchWithCookie(
      baseUrl,
      `/api/orders?q=${encodeURIComponent(q)}`,
      {},
      cookie,
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as { items: Array<{ id: string }> };
    const ids = body.items.map((item) => item.id);
    expect(ids).toHaveLength(4);
    expect(ids[0]).toBe(nameItem.item.id);
    expect(ids).toEqual(
      expect.arrayContaining([
        nameItem.item.id,
        placeItem.item.id,
        marketItem.item.id,
        descItem.item.id,
      ]),
    );
  });
});
