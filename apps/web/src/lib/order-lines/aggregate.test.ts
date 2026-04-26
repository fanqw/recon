import { Prisma } from "@prisma/client";
import { describe, expect, it } from "vitest";
import {
  aggregateOrderLinesForUi,
  lineRoundedTotal,
  type OrderLineWithRelations,
} from "./aggregate";

function fakeRow(partial: {
  price: string;
  count: number | string;
  lineTotal: string;
  categoryId: string;
  categoryName: string;
}): OrderLineWithRelations {
  const category = {
    id: partial.categoryId,
    name: partial.categoryName,
    desc: null,
    deleted: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  const unit = {
    id: "u1",
    name: "斤",
    desc: null,
    deleted: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  const commodity = {
    id: "c1",
    name: "苹果",
    categoryId: partial.categoryId,
    unitId: unit.id,
    desc: null,
    deleted: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    category,
    unit,
  };
  return {
    id: "l1",
    orderId: "o1",
    commodityId: commodity.id,
    count: new Prisma.Decimal(partial.count),
    price: new Prisma.Decimal(partial.price),
    lineTotal: new Prisma.Decimal(partial.lineTotal),
    desc: null,
    deleted: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    commodity,
  };
}

describe("aggregateOrderLinesForUi", () => {
  it("total_price 为舍入基准，line_total 持久化；合计用 line_total", () => {
    const rows = [
      fakeRow({
        price: "10.5",
        count: 3,
        lineTotal: "32",
        categoryId: "cat-a",
        categoryName: "水果",
      }),
    ];
    const out = aggregateOrderLinesForUi(rows);
    expect(out).toHaveLength(1);
    expect(out[0].total_price).toBe(lineRoundedTotal(rows[0].price, 3));
    expect(out[0].line_total).toBe(32);
    expect(out[0].total_order_price).toBe(32);
    expect(out[0].total_category_price).toBe(32);
  });

  it("keeps refund lines as negative amounts in category and order totals", () => {
    const rows = [
      fakeRow({
        price: "-15",
        count: 2,
        lineTotal: "-30",
        categoryId: "cat-a",
        categoryName: "水果",
      }),
    ];

    const out = aggregateOrderLinesForUi(rows);

    expect(out[0].total_price).toBe(-30);
    expect(out[0].line_total).toBe(-30);
    expect(out[0].total_category_price).toBe(-30);
    expect(out[0].total_order_price).toBe(-30);
  });
});
