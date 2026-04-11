import { describe, expect, inject, it } from "vitest";
import {
  deleteWithCookie,
  fetchWithCookie,
  loginAsAdmin,
  postJsonWithCookie,
} from "../http-client";

function suffix(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

async function createPurchasePlace(
  baseUrl: string,
  cookie: string,
  suf: string
): Promise<string> {
  const res = await postJsonWithCookie(
    baseUrl,
    "/api/purchase-places",
    {
      place: `ld-place-${suf}`,
      marketName: `ld-market-${suf}`,
    },
    cookie
  );
  expect(res.status).toBe(201);
  const body = (await res.json()) as { item: { id: string } };
  return body.item.id;
}

describe("逻辑删除后默认列表不再包含", () => {
  it("DELETE /api/categories/[id]", async () => {
    const baseUrl = inject("testBaseUrl");
    const cookie = await loginAsAdmin(baseUrl);
    const suf = suffix();
    const create = await postJsonWithCookie(
      baseUrl,
      "/api/categories",
      { name: `ld-cat-${suf}` },
      cookie
    );
    expect(create.status).toBe(201);
    const { item } = (await create.json()) as { item: { id: string } };

    const listBefore = await fetchWithCookie(baseUrl, "/api/categories", {}, cookie);
    const itemsBefore = ((await listBefore.json()) as { items: { id: string }[] })
      .items;
    expect(itemsBefore.some((r) => r.id === item.id)).toBe(true);

    const del = await deleteWithCookie(baseUrl, `/api/categories/${item.id}`, cookie);
    expect(del.status).toBe(200);

    const listAfter = await fetchWithCookie(baseUrl, "/api/categories", {}, cookie);
    const itemsAfter = ((await listAfter.json()) as { items: { id: string }[] })
      .items;
    expect(itemsAfter.some((r) => r.id === item.id)).toBe(false);
  });

  it("DELETE /api/units/[id]", async () => {
    const baseUrl = inject("testBaseUrl");
    const cookie = await loginAsAdmin(baseUrl);
    const suf = suffix();
    const create = await postJsonWithCookie(
      baseUrl,
      "/api/units",
      { name: `ld-unit-${suf}` },
      cookie
    );
    expect(create.status).toBe(201);
    const { item } = (await create.json()) as { item: { id: string } };

    const listBefore = await fetchWithCookie(baseUrl, "/api/units", {}, cookie);
    const itemsBefore = ((await listBefore.json()) as { items: { id: string }[] })
      .items;
    expect(itemsBefore.some((r) => r.id === item.id)).toBe(true);

    const del = await deleteWithCookie(baseUrl, `/api/units/${item.id}`, cookie);
    expect(del.status).toBe(200);

    const listAfter = await fetchWithCookie(baseUrl, "/api/units", {}, cookie);
    const itemsAfter = ((await listAfter.json()) as { items: { id: string }[] })
      .items;
    expect(itemsAfter.some((r) => r.id === item.id)).toBe(false);
  });

  it("DELETE /api/commodities/[id]", async () => {
    const baseUrl = inject("testBaseUrl");
    const cookie = await loginAsAdmin(baseUrl);
    const suf = suffix();

    const catRes = await postJsonWithCookie(
      baseUrl,
      "/api/categories",
      { name: `ld-c2-${suf}` },
      cookie
    );
    const unitRes = await postJsonWithCookie(
      baseUrl,
      "/api/units",
      { name: `ld-u2-${suf}` },
      cookie
    );
    expect(catRes.status).toBe(201);
    expect(unitRes.status).toBe(201);
    const cat = (await catRes.json()) as { item: { id: string } };
    const unit = (await unitRes.json()) as { item: { id: string } };

    const comRes = await postJsonWithCookie(
      baseUrl,
      "/api/commodities",
      {
        name: `ld-com-${suf}`,
        categoryId: cat.item.id,
        unitId: unit.item.id,
      },
      cookie
    );
    expect(comRes.status).toBe(201);
    const com = (await comRes.json()) as { item: { id: string } };

    const listBefore = await fetchWithCookie(
      baseUrl,
      "/api/commodities",
      {},
      cookie
    );
    const itemsBefore = ((await listBefore.json()) as { items: { id: string }[] })
      .items;
    expect(itemsBefore.some((r) => r.id === com.item.id)).toBe(true);

    const del = await deleteWithCookie(
      baseUrl,
      `/api/commodities/${com.item.id}`,
      cookie
    );
    expect(del.status).toBe(200);

    const listAfter = await fetchWithCookie(
      baseUrl,
      "/api/commodities",
      {},
      cookie
    );
    const itemsAfter = ((await listAfter.json()) as { items: { id: string }[] })
      .items;
    expect(itemsAfter.some((r) => r.id === com.item.id)).toBe(false);
  });

  it("DELETE /api/orders/[id] 后列表不含该订单", async () => {
    const baseUrl = inject("testBaseUrl");
    const cookie = await loginAsAdmin(baseUrl);
    const suf = suffix();
    const purchasePlaceId = await createPurchasePlace(baseUrl, cookie, suf);
    const ordRes = await postJsonWithCookie(
      baseUrl,
      "/api/orders",
      { name: `ld-ord-${suf}`, purchasePlaceId },
      cookie
    );
    expect(ordRes.status).toBe(201);
    const ord = (await ordRes.json()) as { item: { id: string } };

    const listBefore = await fetchWithCookie(baseUrl, "/api/orders", {}, cookie);
    const itemsBefore = ((await listBefore.json()) as { items: { id: string }[] })
      .items;
    expect(itemsBefore.some((r) => r.id === ord.item.id)).toBe(true);

    const del = await deleteWithCookie(baseUrl, `/api/orders/${ord.item.id}`, cookie);
    expect(del.status).toBe(200);

    const listAfter = await fetchWithCookie(baseUrl, "/api/orders", {}, cookie);
    const itemsAfter = ((await listAfter.json()) as { items: { id: string }[] })
      .items;
    expect(itemsAfter.some((r) => r.id === ord.item.id)).toBe(false);
  });

  it("DELETE /api/order-lines/[id] 后明细列表不再包含该行", async () => {
    const baseUrl = inject("testBaseUrl");
    const cookie = await loginAsAdmin(baseUrl);
    const suf = suffix();

    const catRes = await postJsonWithCookie(
      baseUrl,
      "/api/categories",
      { name: `ld-c3-${suf}` },
      cookie
    );
    const unitRes = await postJsonWithCookie(
      baseUrl,
      "/api/units",
      { name: `ld-u3-${suf}` },
      cookie
    );
    expect(catRes.status).toBe(201);
    expect(unitRes.status).toBe(201);
    const cat = (await catRes.json()) as { item: { id: string } };
    const unit = (await unitRes.json()) as { item: { id: string } };

    const comRes = await postJsonWithCookie(
      baseUrl,
      "/api/commodities",
      {
        name: `ld-cm3-${suf}`,
        categoryId: cat.item.id,
        unitId: unit.item.id,
      },
      cookie
    );
    expect(comRes.status).toBe(201);
    const com = (await comRes.json()) as { item: { id: string } };
    const purchasePlaceId = await createPurchasePlace(baseUrl, cookie, suf);

    const ordRes = await postJsonWithCookie(
      baseUrl,
      "/api/orders",
      { name: `ld-o3-${suf}`, purchasePlaceId },
      cookie
    );
    expect(ordRes.status).toBe(201);
    const ord = (await ordRes.json()) as { item: { id: string } };

    const lineRes = await postJsonWithCookie(
      baseUrl,
      "/api/order-lines",
      {
        orderId: ord.item.id,
        commodityId: com.item.id,
        count: 1,
        price: 1,
      },
      cookie
    );
    expect(lineRes.status).toBe(201);
    const line = (await lineRes.json()) as { item: { id: string } };

    const linesBefore = await fetchWithCookie(
      baseUrl,
      `/api/orders/${ord.item.id}/lines`,
      {},
      cookie
    );
    const rowsBefore = ((await linesBefore.json()) as { items: { id: string }[] })
      .items;
    expect(rowsBefore.some((r) => r.id === line.item.id)).toBe(true);

    const del = await deleteWithCookie(
      baseUrl,
      `/api/order-lines/${line.item.id}`,
      cookie
    );
    expect(del.status).toBe(200);

    const linesAfter = await fetchWithCookie(
      baseUrl,
      `/api/orders/${ord.item.id}/lines`,
      {},
      cookie
    );
    const rowsAfter = ((await linesAfter.json()) as { items: { id: string }[] })
      .items;
    expect(rowsAfter.some((r) => r.id === line.item.id)).toBe(false);
  });
});
