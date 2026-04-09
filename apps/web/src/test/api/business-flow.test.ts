import { describe, expect, inject, it } from "vitest";
import {
  fetchWithCookie,
  loginAsAdmin,
  patchJsonWithCookie,
  postJsonWithCookie,
} from "../http-client";

describe("主数据与订单 API 最小成功路径", () => {
  it("未认证访问单位列表返回 401", async () => {
    const baseUrl = inject("testBaseUrl");
    const res = await fetch(`${baseUrl}/api/units`);
    expect(res.status).toBe(401);
  });

  it("认证后可列出单位且 items 为数组", async () => {
    const baseUrl = inject("testBaseUrl");
    const cookie = await loginAsAdmin(baseUrl);
    const res = await fetchWithCookie(baseUrl, "/api/units", {}, cookie);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { items?: unknown };
    expect(Array.isArray(body.items)).toBe(true);
  });

  it("创建商品时关联无效分类返回 400", async () => {
    const baseUrl = inject("testBaseUrl");
    const cookie = await loginAsAdmin(baseUrl);
    const unitsRes = await fetchWithCookie(baseUrl, "/api/units", {}, cookie);
    const unitsBody = (await unitsRes.json()) as {
      items: { id: string }[];
    };
    const unitId = unitsBody.items[0]?.id;
    expect(unitId).toBeTruthy();

    const bad = await postJsonWithCookie(
      baseUrl,
      "/api/commodities",
      {
        name: "不应创建",
        categoryId: "clnonexistent000000000000000",
        unitId,
      },
      cookie,
    );
    expect(bad.status).toBe(400);
  });

  it("串联：创建分类/单位/商品、订单与明细，GET lines 含聚合字段", async () => {
    const baseUrl = inject("testBaseUrl");
    const cookie = await loginAsAdmin(baseUrl);
    const suf = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

    const catRes = await postJsonWithCookie(
      baseUrl,
      "/api/categories",
      { name: `api-cat-${suf}`, desc: "test" },
      cookie,
    );
    expect(catRes.status).toBe(201);
    const cat = (await catRes.json()) as { item: { id: string } };

    const unitRes = await postJsonWithCookie(
      baseUrl,
      "/api/units",
      { name: `api-unit-${suf}`, desc: "test" },
      cookie,
    );
    expect(unitRes.status).toBe(201);
    const unit = (await unitRes.json()) as { item: { id: string } };

    const comRes = await postJsonWithCookie(
      baseUrl,
      "/api/commodities",
      {
        name: `api-com-${suf}`,
        categoryId: cat.item.id,
        unitId: unit.item.id,
      },
      cookie,
    );
    expect(comRes.status).toBe(201);
    const com = (await comRes.json()) as { item: { id: string } };

    const ordRes = await postJsonWithCookie(
      baseUrl,
      "/api/orders",
      { name: `api-ord-${suf}`, desc: "test" },
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
        count: 3,
        price: 10.5,
      },
      cookie,
    );
    expect(lineRes.status).toBe(201);

    const linesRes = await fetchWithCookie(
      baseUrl,
      `/api/orders/${ord.item.id}/lines`,
      {},
      cookie,
    );
    expect(linesRes.status).toBe(200);
    const linesBody = (await linesRes.json()) as {
      items: Array<{
        total_price: number;
        line_total: number;
        origin_total_price: number;
        total_category_price: number;
        total_order_price: number;
        commodity: { name: string };
        category: { name: string };
      }>;
    };
    expect(linesBody.items.length).toBeGreaterThanOrEqual(1);
    const row = linesBody.items[0];
    expect(row.total_price).toBe(32);
    expect(row.line_total).toBe(32);
    expect(typeof row.origin_total_price).toBe("number");
    expect(row.total_category_price).toBe(32);
    expect(row.total_order_price).toBe(32);
    expect(row.commodity.name).toBe(`api-com-${suf}`);
  });

  it("POST /api/order-lines 仅空白商品名返回 400", async () => {
    const baseUrl = inject("testBaseUrl");
    const cookie = await loginAsAdmin(baseUrl);
    const suf = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

    const catRes = await postJsonWithCookie(
      baseUrl,
      "/api/categories",
      { name: `api-cat2-${suf}` },
      cookie,
    );
    const unitRes = await postJsonWithCookie(
      baseUrl,
      "/api/units",
      { name: `api-u2-${suf}` },
      cookie,
    );
    expect(catRes.status).toBe(201);
    expect(unitRes.status).toBe(201);
    const cat = (await catRes.json()) as { item: { id: string } };
    const unit = (await unitRes.json()) as { item: { id: string } };

    const ordRes = await postJsonWithCookie(
      baseUrl,
      "/api/orders",
      { name: `api-o2-${suf}` },
      cookie,
    );
    expect(ordRes.status).toBe(201);
    const ord = (await ordRes.json()) as { item: { id: string } };

    const bad = await postJsonWithCookie(
      baseUrl,
      "/api/order-lines",
      {
        orderId: ord.item.id,
        count: 1,
        price: 1,
        categoryId: cat.item.id,
        unitId: unit.item.id,
        commodityName: "   ",
      },
      cookie,
    );
    expect(bad.status).toBe(400);
  });

  it("POST /api/order-lines 仅用名称编排创建明细且复用同一商品", async () => {
    const baseUrl = inject("testBaseUrl");
    const cookie = await loginAsAdmin(baseUrl);
    const suf = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

    const ordRes = await postJsonWithCookie(
      baseUrl,
      "/api/orders",
      { name: `api-orch-${suf}` },
      cookie,
    );
    expect(ordRes.status).toBe(201);
    const ord = (await ordRes.json()) as { item: { id: string } };

    const payload = {
      orderId: ord.item.id,
      count: 2,
      price: 5,
      categoryName: `  orch-cat-${suf}  `,
      unitName: `orch-unit-${suf}`,
      commodityName: `orch-com-${suf}`,
    };

    const line1 = await postJsonWithCookie(
      baseUrl,
      "/api/order-lines",
      payload,
      cookie,
    );
    expect(line1.status).toBe(201);
    const body1 = (await line1.json()) as {
      item: { commodityId: string; commodity: { name: string } };
    };
    expect(body1.item.commodity.name).toBe(`orch-com-${suf}`);

    const line2 = await postJsonWithCookie(
      baseUrl,
      "/api/order-lines",
      {
        ...payload,
        count: 1,
        price: 10,
      },
      cookie,
    );
    expect(line2.status).toBe(201);
    const body2 = (await line2.json()) as { item: { commodityId: string } };
    expect(body2.item.commodityId).toBe(body1.item.commodityId);
  });

  it("PATCH 主数据 name 仅空白时返回 400", async () => {
    const baseUrl = inject("testBaseUrl");
    const cookie = await loginAsAdmin(baseUrl);
    const suf = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

    const catRes = await postJsonWithCookie(
      baseUrl,
      "/api/categories",
      { name: `patch-cat-${suf}` },
      cookie,
    );
    const unitRes = await postJsonWithCookie(
      baseUrl,
      "/api/units",
      { name: `patch-unit-${suf}` },
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
        name: `patch-com-${suf}`,
        categoryId: cat.item.id,
        unitId: unit.item.id,
      },
      cookie,
    );
    expect(comRes.status).toBe(201);
    const com = (await comRes.json()) as { item: { id: string } };

    const catBad = await patchJsonWithCookie(
      baseUrl,
      `/api/categories/${cat.item.id}`,
      { name: "   " },
      cookie,
    );
    const unitBad = await patchJsonWithCookie(
      baseUrl,
      `/api/units/${unit.item.id}`,
      { name: "\t" },
      cookie,
    );
    const comBad = await patchJsonWithCookie(
      baseUrl,
      `/api/commodities/${com.item.id}`,
      { name: "  " },
      cookie,
    );
    expect(catBad.status).toBe(400);
    expect(unitBad.status).toBe(400);
    expect(comBad.status).toBe(400);
  });
});
