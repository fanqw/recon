import { describe, expect, inject, it } from "vitest";
import {
  deleteWithCookie,
  loginAsAdmin,
  postJsonWithCookie,
} from "../http-client";

function suffix(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

async function createPurchasePlace(
  baseUrl: string,
  cookie: string,
  suf: string,
): Promise<string> {
  const res = await postJsonWithCookie(
    baseUrl,
    "/api/purchase-places",
    {
      place: `dg-place-${suf}`,
      marketName: `dg-market-${suf}`,
    },
    cookie,
  );
  expect(res.status).toBe(201);
  const body = (await res.json()) as { item: { id: string } };
  return body.item.id;
}

describe("删除关联拦截", () => {
  it("分类被未删除商品引用时返回 409 + CATEGORY_IN_USE", async () => {
    const baseUrl = inject("testBaseUrl");
    const cookie = await loginAsAdmin(baseUrl);
    const suf = suffix();

    const catRes = await postJsonWithCookie(
      baseUrl,
      "/api/categories",
      { name: `dg-cat-${suf}` },
      cookie,
    );
    const unitRes = await postJsonWithCookie(
      baseUrl,
      "/api/units",
      { name: `dg-unit-${suf}` },
      cookie,
    );
    expect(catRes.status).toBe(201);
    expect(unitRes.status).toBe(201);
    const cat = (await catRes.json()) as { item: { id: string } };
    const unit = (await unitRes.json()) as { item: { id: string } };

    const comRes = await postJsonWithCookie(
      baseUrl,
      "/api/commodities",
      {
        name: `dg-com-${suf}`,
        categoryId: cat.item.id,
        unitId: unit.item.id,
      },
      cookie,
    );
    expect(comRes.status).toBe(201);

    const del = await deleteWithCookie(baseUrl, `/api/categories/${cat.item.id}`, cookie);
    expect(del.status).toBe(409);
    const body = (await del.json()) as { code: string };
    expect(body.code).toBe("CATEGORY_IN_USE");
  });

  it("单位被未删除商品引用时返回 409 + UNIT_IN_USE", async () => {
    const baseUrl = inject("testBaseUrl");
    const cookie = await loginAsAdmin(baseUrl);
    const suf = suffix();

    const catRes = await postJsonWithCookie(
      baseUrl,
      "/api/categories",
      { name: `dg2-cat-${suf}` },
      cookie,
    );
    const unitRes = await postJsonWithCookie(
      baseUrl,
      "/api/units",
      { name: `dg2-unit-${suf}` },
      cookie,
    );
    expect(catRes.status).toBe(201);
    expect(unitRes.status).toBe(201);
    const cat = (await catRes.json()) as { item: { id: string } };
    const unit = (await unitRes.json()) as { item: { id: string } };

    const comRes = await postJsonWithCookie(
      baseUrl,
      "/api/commodities",
      {
        name: `dg2-com-${suf}`,
        categoryId: cat.item.id,
        unitId: unit.item.id,
      },
      cookie,
    );
    expect(comRes.status).toBe(201);

    const del = await deleteWithCookie(baseUrl, `/api/units/${unit.item.id}`, cookie);
    expect(del.status).toBe(409);
    const body = (await del.json()) as { code: string };
    expect(body.code).toBe("UNIT_IN_USE");
  });

  it("商品被未删除订单明细引用时返回 409 + COMMODITY_IN_USE", async () => {
    const baseUrl = inject("testBaseUrl");
    const cookie = await loginAsAdmin(baseUrl);
    const suf = suffix();

    const catRes = await postJsonWithCookie(
      baseUrl,
      "/api/categories",
      { name: `dg3-cat-${suf}` },
      cookie,
    );
    const unitRes = await postJsonWithCookie(
      baseUrl,
      "/api/units",
      { name: `dg3-unit-${suf}` },
      cookie,
    );
    expect(catRes.status).toBe(201);
    expect(unitRes.status).toBe(201);
    const cat = (await catRes.json()) as { item: { id: string } };
    const unit = (await unitRes.json()) as { item: { id: string } };

    const comRes = await postJsonWithCookie(
      baseUrl,
      "/api/commodities",
      {
        name: `dg3-com-${suf}`,
        categoryId: cat.item.id,
        unitId: unit.item.id,
      },
      cookie,
    );
    expect(comRes.status).toBe(201);
    const com = (await comRes.json()) as { item: { id: string } };

    const purchasePlaceId = await createPurchasePlace(baseUrl, cookie, suf);
    const ordRes = await postJsonWithCookie(
      baseUrl,
      "/api/orders",
      { name: `dg3-order-${suf}`, purchasePlaceId },
      cookie,
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
      cookie,
    );
    expect(lineRes.status).toBe(201);

    const del = await deleteWithCookie(baseUrl, `/api/commodities/${com.item.id}`, cookie);
    expect(del.status).toBe(409);
    const body = (await del.json()) as { code: string };
    expect(body.code).toBe("COMMODITY_IN_USE");
  });

  it("进货地被未删除订单引用时返回 409 + PURCHASE_PLACE_IN_USE", async () => {
    const baseUrl = inject("testBaseUrl");
    const cookie = await loginAsAdmin(baseUrl);
    const suf = suffix();
    const purchasePlaceId = await createPurchasePlace(baseUrl, cookie, suf);

    const ordRes = await postJsonWithCookie(
      baseUrl,
      "/api/orders",
      { name: `dg4-order-${suf}`, purchasePlaceId },
      cookie,
    );
    expect(ordRes.status).toBe(201);

    const del = await deleteWithCookie(
      baseUrl,
      `/api/purchase-places/${purchasePlaceId}`,
      cookie,
    );
    expect(del.status).toBe(409);
    const body = (await del.json()) as { code: string };
    expect(body.code).toBe("PURCHASE_PLACE_IN_USE");
  });
});
