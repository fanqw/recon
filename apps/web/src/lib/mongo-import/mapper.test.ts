import { Decimal128, ObjectId } from "bson";
import { describe, expect, it } from "vitest";
import {
  deriveMongoOrderPurchasePlace,
  mapMongoCategory,
  mapMongoOrderCommodity,
  objectIdString,
} from "./mapper";

describe("objectIdString", () => {
  it("keeps Mongo ObjectId values as stable Prisma string IDs", () => {
    expect(objectIdString(new ObjectId("643968224a410a01a850b710"))).toBe(
      "643968224a410a01a850b710",
    );
  });
});

describe("mapMongoCategory", () => {
  it("maps v1 timestamp names and deletion state to the v2 Category shape", () => {
    const createdAt = new Date("2023-04-14T14:50:10.125Z");
    const updatedAt = new Date("2023-04-14T15:22:18.423Z");

    expect(
      mapMongoCategory({
        _id: new ObjectId("643968224a410a01a850b710"),
        name: " 水果 ",
        desc: "水果类",
        deleted: true,
        create_at: createdAt,
        update_at: updatedAt,
      }),
    ).toEqual({
      id: "643968224a410a01a850b710",
      name: "水果",
      desc: "水果类",
      deleted: true,
      createdAt,
      updatedAt,
    });
  });
});

describe("deriveMongoOrderPurchasePlace", () => {
  it("splits production order remarks into market and purchase place", () => {
    expect(deriveMongoOrderPurchasePlace({ desc: "大润发25.1.12晋城" })).toEqual({
      id: "legacy-place-cd8dbd",
      place: "晋城",
      marketName: "大润发",
      desc: "由生产订单备注拆解：大润发25.1.12晋城",
    });
  });

  it("uses the trailing location after the date when the remark has spaces", () => {
    expect(deriveMongoOrderPurchasePlace({ desc: "幸福城 25.2.27 洛阳" })).toEqual({
      id: "legacy-place-2b32c6",
      place: "洛阳",
      marketName: "幸福城",
      desc: "由生产订单备注拆解：幸福城 25.2.27 洛阳",
    });
  });

  it("falls back to a legacy bucket for empty or non-location remarks", () => {
    expect(deriveMongoOrderPurchasePlace({ desc: "测试订单" })).toEqual({
      id: "legacy-place-5ab2f5",
      place: "历史导入",
      marketName: "生产 MongoDB 导入",
      desc: "生产订单备注未能拆解为进货地：测试订单",
    });
  });
});

describe("mapMongoOrderCommodity", () => {
  it("converts Decimal128 prices and computes the required v2 line total", () => {
    expect(
      mapMongoOrderCommodity({
        _id: new ObjectId("64be33db8416020561fbc7ad"),
        order_id: new ObjectId("64be32e48416020561fbc799"),
        commodity_id: new ObjectId("64be2f398416020561fbc6f2"),
        count: 46,
        price: Decimal128.fromString("2.80"),
        desc: "",
        deleted: false,
        create_at: new Date("2023-07-24T08:18:35.711Z"),
        update_at: new Date("2023-07-25T01:33:49.787Z"),
      }),
    ).toMatchObject({
      id: "64be33db8416020561fbc7ad",
      orderId: "64be32e48416020561fbc799",
      commodityId: "64be2f398416020561fbc6f2",
      count: "46",
      price: "2.80",
      lineTotal: "128.80",
      desc: "",
      deleted: false,
    });
  });

  it("preserves Decimal128 counts instead of rounding production quantities", () => {
    expect(
      mapMongoOrderCommodity({
        _id: new ObjectId("64bf38e4f6ebf006c67f9a76"),
        order_id: new ObjectId("64bf382cb4d12969115d8c76"),
        commodity_id: new ObjectId("64bf3790b4d12969115d8c4c"),
        count: Decimal128.fromString("58.999"),
        price: Decimal128.fromString("4.288"),
        deleted: false,
      }),
    ).toMatchObject({
      count: "58.999",
      lineTotal: "252.99",
    });
  });
});
