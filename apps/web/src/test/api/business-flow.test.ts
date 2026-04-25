import { describe, expect, inject, it } from "vitest";
import {
  fetchWithCookie,
  loginAsAdmin,
  patchJsonWithCookie,
  postJsonWithCookie,
} from "../http-client";

async function createPurchasePlace(
  baseUrl: string,
  cookie: string,
  suffix: string,
): Promise<string> {
  const res = await postJsonWithCookie(
    baseUrl,
    "/api/purchase-places",
    {
      place: `api-place-${suffix}`,
      marketName: `api-market-${suffix}`,
    },
    cookie,
  );
  expect(res.status).toBe(201);
  const body = (await res.json()) as { item: { id: string } };
  return body.item.id;
}

describe("主数据与订单 API 最小成功路径", () => {
  it("未认证访问单位列表返回 401", async () => {
    const baseUrl = inject("testBaseUrl");
    const res = await fetch(`${baseUrl}/api/units`);
    expect(res.status).toBe(401);
  });

  it("seed 基线包含中文语义化主数据与联调订单样本", async () => {
    const baseUrl = inject("testBaseUrl");
    const cookie = await loginAsAdmin(baseUrl);

    const [categoriesRes, unitsRes, commoditiesRes, purchasePlacesRes, ordersRes] =
      await Promise.all([
        fetchWithCookie(baseUrl, "/api/categories", {}, cookie),
        fetchWithCookie(baseUrl, "/api/units", {}, cookie),
        fetchWithCookie(baseUrl, "/api/commodities", {}, cookie),
        fetchWithCookie(baseUrl, "/api/purchase-places", {}, cookie),
        fetchWithCookie(baseUrl, "/api/orders", {}, cookie),
      ]);

    expect(categoriesRes.status).toBe(200);
    expect(unitsRes.status).toBe(200);
    expect(commoditiesRes.status).toBe(200);
    expect(purchasePlacesRes.status).toBe(200);
    expect(ordersRes.status).toBe(200);

    const categoriesBody = (await categoriesRes.json()) as {
      items: { name: string }[];
    };
    const unitsBody = (await unitsRes.json()) as { items: { name: string }[] };
    const commoditiesBody = (await commoditiesRes.json()) as {
      items: { name: string }[];
    };
    const purchasePlacesBody = (await purchasePlacesRes.json()) as {
      items: { place: string; marketName: string }[];
    };
    const ordersBody = (await ordersRes.json()) as {
      items: { name: string }[];
    };

    expect(categoriesBody.items.map((item) => item.name)).toEqual(
      expect.arrayContaining(["时令水果", "叶菜豆品", "粮油干货", "鲜肉水产"]),
    );
    expect(unitsBody.items.map((item) => item.name)).toEqual(
      expect.arrayContaining(["斤", "件", "箱", "袋", "桶"]),
    );
    expect(commoditiesBody.items.map((item) => item.name)).toEqual(
      expect.arrayContaining([
        "麒麟西瓜",
        "海南芒果",
        "盒装蓝莓",
        "上海青",
        "洪湖莲藕",
        "北豆腐",
        "五常大米",
        "鲁花菜籽油",
        "前腿猪肉",
        "鸡胸肉",
        "基围虾",
      ]),
    );
    expect(
      purchasePlacesBody.items.some(
        (item) => item.place === "武汉" && item.marketName === "白沙洲农副产品大市场",
      ),
    ).toBe(true);
    expect(
      purchasePlacesBody.items.some(
        (item) => item.place === "长沙" && item.marketName === "红星全球农批中心",
      ),
    ).toBe(true);
    expect(
      purchasePlacesBody.items.some(
        (item) => item.place === "郑州" && item.marketName === "万邦国际农产品物流城",
      ),
    ).toBe(true);
    expect(ordersBody.items.length).toBeGreaterThanOrEqual(2);
    expect(ordersBody.items.map((item) => item.name)).toEqual(
      expect.arrayContaining([
        "2026-03-24 白沙洲门店周初补货单",
        "2026-04-15 红星后厨稳价采购单",
        "2026-04-20 万邦周末促销备货单",
        "2026-04-22 白沙洲月末滚动补货单",
      ]),
    );
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

  it("POST /api/orders 缺少 purchasePlaceId 返回 400", async () => {
    const baseUrl = inject("testBaseUrl");
    const cookie = await loginAsAdmin(baseUrl);
    const suf = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

    const res = await postJsonWithCookie(
      baseUrl,
      "/api/orders",
      { name: `api-ord-missing-purchasePlaceId-${suf}` },
      cookie,
    );

    expect(res.status).toBe(400);
  });

  it("POST /api/orders 使用无效 purchasePlaceId 返回 400", async () => {
    const baseUrl = inject("testBaseUrl");
    const cookie = await loginAsAdmin(baseUrl);
    const suf = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

    const res = await postJsonWithCookie(
      baseUrl,
      "/api/orders",
      {
        name: `api-ord-invalid-purchasePlaceId-${suf}`,
        purchasePlaceId: "clnonexistent000000000000000",
      },
      cookie,
    );

    expect(res.status).toBe(400);
  });

  it("PATCH /api/orders/[id] 缺少 purchasePlaceId 返回 400", async () => {
    const baseUrl = inject("testBaseUrl");
    const cookie = await loginAsAdmin(baseUrl);
    const suf = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    const purchasePlaceId = await createPurchasePlace(baseUrl, cookie, suf);

    const createOrder = await postJsonWithCookie(
      baseUrl,
      "/api/orders",
      { name: `patch-ord-missing-place-${suf}`, purchasePlaceId },
      cookie,
    );
    expect(createOrder.status).toBe(201);
    const created = (await createOrder.json()) as { item: { id: string } };

    const patch = await patchJsonWithCookie(
      baseUrl,
      `/api/orders/${created.item.id}`,
      { name: `patch-ord-missing-place-updated-${suf}` },
      cookie,
    );
    expect(patch.status).toBe(400);
  });

  it("PATCH /api/orders/[id] 使用无效或已删除 purchasePlaceId 返回 400", async () => {
    const baseUrl = inject("testBaseUrl");
    const cookie = await loginAsAdmin(baseUrl);
    const suf = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    const purchasePlaceId = await createPurchasePlace(baseUrl, cookie, suf);

    const createOrder = await postJsonWithCookie(
      baseUrl,
      "/api/orders",
      { name: `patch-ord-invalid-place-${suf}`, purchasePlaceId },
      cookie,
    );
    expect(createOrder.status).toBe(201);
    const created = (await createOrder.json()) as { item: { id: string } };

    const invalidPatch = await patchJsonWithCookie(
      baseUrl,
      `/api/orders/${created.item.id}`,
      { purchasePlaceId: "clnonexistent000000000000000" },
      cookie,
    );
    expect(invalidPatch.status).toBe(400);

    const deletedPlaceId = await createPurchasePlace(baseUrl, cookie, `${suf}-del`);
    const deleteRes = await fetchWithCookie(
      baseUrl,
      `/api/purchase-places/${deletedPlaceId}`,
      { method: "DELETE" },
      cookie,
    );
    expect(deleteRes.status).toBe(200);

    const deletedPatch = await patchJsonWithCookie(
      baseUrl,
      `/api/orders/${created.item.id}`,
      { purchasePlaceId: deletedPlaceId },
      cookie,
    );
    expect(deletedPatch.status).toBe(400);
  });

  it("PATCH /api/orders/[id] 传入有效 purchasePlaceId 可更新", async () => {
    const baseUrl = inject("testBaseUrl");
    const cookie = await loginAsAdmin(baseUrl);
    const suf = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    const purchasePlaceId = await createPurchasePlace(baseUrl, cookie, `${suf}-old`);
    const nextPurchasePlaceId = await createPurchasePlace(baseUrl, cookie, `${suf}-new`);

    const createOrder = await postJsonWithCookie(
      baseUrl,
      "/api/orders",
      { name: `patch-ord-valid-place-${suf}`, purchasePlaceId },
      cookie,
    );
    expect(createOrder.status).toBe(201);
    const created = (await createOrder.json()) as { item: { id: string } };

    const patch = await patchJsonWithCookie(
      baseUrl,
      `/api/orders/${created.item.id}`,
      { purchasePlaceId: nextPurchasePlaceId },
      cookie,
    );
    expect(patch.status).toBe(200);
    const body = (await patch.json()) as {
      item: { purchasePlaceId: string; purchasePlace: { id: string } };
    };
    expect(body.item.purchasePlaceId).toBe(nextPurchasePlaceId);
    expect(body.item.purchasePlace.id).toBe(nextPurchasePlaceId);
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
    const purchasePlaceId = await createPurchasePlace(baseUrl, cookie, suf);

    const ordRes = await postJsonWithCookie(
      baseUrl,
      "/api/orders",
      { name: `api-ord-${suf}`, purchasePlaceId, desc: "test" },
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
        lineTotal: 32,
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
    const purchasePlaceId = await createPurchasePlace(baseUrl, cookie, suf);

    const ordRes = await postJsonWithCookie(
      baseUrl,
      "/api/orders",
      { name: `api-o2-${suf}`, purchasePlaceId },
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
    const purchasePlaceId = await createPurchasePlace(baseUrl, cookie, suf);

    const ordRes = await postJsonWithCookie(
      baseUrl,
      "/api/orders",
      { name: `api-orch-${suf}`, purchasePlaceId },
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

  it("POST 主数据违反未删除名称唯一时返回 409", async () => {
    const baseUrl = inject("testBaseUrl");
    const cookie = await loginAsAdmin(baseUrl);
    const suf = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    const catName = `uniq-cat-${suf}`;

    const c1 = await postJsonWithCookie(
      baseUrl,
      "/api/categories",
      { name: catName },
      cookie,
    );
    expect(c1.status).toBe(201);
    const cDup = await postJsonWithCookie(
      baseUrl,
      "/api/categories",
      { name: catName },
      cookie,
    );
    expect(cDup.status).toBe(409);

    const unitName = `uniq-unit-${suf}`;
    expect(
      (await postJsonWithCookie(baseUrl, "/api/units", { name: unitName }, cookie))
        .status,
    ).toBe(201);
    expect(
      (await postJsonWithCookie(baseUrl, "/api/units", { name: unitName }, cookie))
        .status,
    ).toBe(409);

    const cat = (await c1.json()) as { item: { id: string } };
    const unit = await postJsonWithCookie(
      baseUrl,
      "/api/units",
      { name: `uniq-unit2-${suf}` },
      cookie,
    );
    expect(unit.status).toBe(201);
    const unitBody = (await unit.json()) as { item: { id: string } };
    const comName = `uniq-com-${suf}`;
    expect(
      (
        await postJsonWithCookie(
          baseUrl,
          "/api/commodities",
          {
            name: comName,
            categoryId: cat.item.id,
            unitId: unitBody.item.id,
          },
          cookie,
        )
      ).status,
    ).toBe(201);
    expect(
      (
        await postJsonWithCookie(
          baseUrl,
          "/api/commodities",
          {
            name: comName,
            categoryId: cat.item.id,
            unitId: unitBody.item.id,
          },
          cookie,
        )
      ).status,
    ).toBe(409);
  });

  it("POST 分类 trim 后与已有未删除记录同名时返回 409", async () => {
    const baseUrl = inject("testBaseUrl");
    const cookie = await loginAsAdmin(baseUrl);
    const suf = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    const logical = `trim-dup-${suf}`;
    const first = await postJsonWithCookie(
      baseUrl,
      "/api/categories",
      { name: `  ${logical}  ` },
      cookie,
    );
    expect(first.status).toBe(201);
    const second = await postJsonWithCookie(
      baseUrl,
      "/api/categories",
      { name: logical },
      cookie,
    );
    expect(second.status).toBe(409);
  });

  it("PATCH 主数据改名为与另一未删除记录冲突时返回 409", async () => {
    const baseUrl = inject("testBaseUrl");
    const cookie = await loginAsAdmin(baseUrl);
    const suf = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

    const catA = await postJsonWithCookie(
      baseUrl,
      "/api/categories",
      { name: `pconf-cat-a-${suf}` },
      cookie,
    );
    const catB = await postJsonWithCookie(
      baseUrl,
      "/api/categories",
      { name: `pconf-cat-b-${suf}` },
      cookie,
    );
    expect(catA.status).toBe(201);
    expect(catB.status).toBe(201);
    const bBody = (await catB.json()) as { item: { id: string } };

    const catPatch = await patchJsonWithCookie(
      baseUrl,
      `/api/categories/${bBody.item.id}`,
      { name: `pconf-cat-a-${suf}` },
      cookie,
    );
    expect(catPatch.status).toBe(409);

    const uA = await postJsonWithCookie(
      baseUrl,
      "/api/units",
      { name: `pconf-unit-a-${suf}` },
      cookie,
    );
    const uB = await postJsonWithCookie(
      baseUrl,
      "/api/units",
      { name: `pconf-unit-b-${suf}` },
      cookie,
    );
    expect(uA.status).toBe(201);
    expect(uB.status).toBe(201);
    const uBodyB = (await uB.json()) as { item: { id: string } };
    const unitPatch = await patchJsonWithCookie(
      baseUrl,
      `/api/units/${uBodyB.item.id}`,
      { name: `pconf-unit-a-${suf}` },
      cookie,
    );
    expect(unitPatch.status).toBe(409);

    const cat = (await catA.json()) as { item: { id: string } };
    const unit = (await uA.json()) as { item: { id: string } };
    const comA = await postJsonWithCookie(
      baseUrl,
      "/api/commodities",
      {
        name: `pconf-com-a-${suf}`,
        categoryId: cat.item.id,
        unitId: unit.item.id,
      },
      cookie,
    );
    const comB = await postJsonWithCookie(
      baseUrl,
      "/api/commodities",
      {
        name: `pconf-com-b-${suf}`,
        categoryId: cat.item.id,
        unitId: unit.item.id,
      },
      cookie,
    );
    expect(comA.status).toBe(201);
    expect(comB.status).toBe(201);
    const comBodyB = (await comB.json()) as { item: { id: string } };
    const comPatch = await patchJsonWithCookie(
      baseUrl,
      `/api/commodities/${comBodyB.item.id}`,
      { name: `pconf-com-a-${suf}` },
      cookie,
    );
    expect(comPatch.status).toBe(409);
  });

  it("订单明细创建与更新按传入 lineTotal 原样持久化", async () => {
    const baseUrl = inject("testBaseUrl");
    const cookie = await loginAsAdmin(baseUrl);
    const suf = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    const purchasePlaceId = await createPurchasePlace(baseUrl, cookie, `${suf}-line-total`);

    const createOrder = await postJsonWithCookie(
      baseUrl,
      "/api/orders",
      { name: `line-total-order-${suf}`, purchasePlaceId },
      cookie,
    );
    expect(createOrder.status).toBe(201);
    const orderBody = (await createOrder.json()) as { item: { id: string } };

    const commoditiesRes = await fetchWithCookie(baseUrl, "/api/commodities", {}, cookie);
    expect(commoditiesRes.status).toBe(200);
    const commoditiesBody = (await commoditiesRes.json()) as {
      items: { id: string }[];
    };
    const commodityId = commoditiesBody.items[0]?.id;
    expect(commodityId).toBeTruthy();

    const createLine = await postJsonWithCookie(
      baseUrl,
      "/api/order-lines",
      {
        orderId: orderBody.item.id,
        commodityId,
        count: 3,
        price: 4.55,
        lineTotal: 21.37,
      },
      cookie,
    );
    expect(createLine.status).toBe(201);
    const createdLineBody = (await createLine.json()) as {
      item: { id: string; lineTotal: string };
    };
    expect(Number(createdLineBody.item.lineTotal)).toBe(21.37);

    const patchLine = await patchJsonWithCookie(
      baseUrl,
      `/api/order-lines/${createdLineBody.item.id}`,
      {
        lineTotal: 19.99,
      },
      cookie,
    );
    expect(patchLine.status).toBe(200);
    const patchedLineBody = (await patchLine.json()) as {
      item: { lineTotal: string };
    };
    expect(Number(patchedLineBody.item.lineTotal)).toBe(19.99);
  });
});
