import { Prisma } from "@prisma/client";
import type { Category, Commodity, OrderCommodity, Unit } from "@prisma/client";

/** Prisma 查询返回的单条明细行（含商品、分类、单位）。 */
export type OrderLineWithRelations = OrderCommodity & {
  commodity: Commodity & { category: Category; unit: Unit };
};

/**
 * GET 订单明细表格用行结构；金额字段名与 v1 / Task 14 约定一致（snake_case）。
 */
export type OrderLineRowForUi = {
  id: string;
  orderId: string;
  commodityId: string;
  count: number;
  price: number;
  desc: string | null;
  deleted: boolean;
  createdAt: Date;
  updatedAt: Date;
  /** 对应 v1 管道 `$addFields.total_price`：`$round: { $multiply: [price, count] }`（Mongo 单参 $round → 四舍五入到整数） */
  total_price: number;
  /** 对应 v1 管道末尾 `$addFields.origin_total_price`：`$multiply: [price, count]`，不经 $round */
  origin_total_price: number;
  /** 对应 v1 第二次 `$group`：按分类 id 对 `total_price` 求和 */
  total_category_price: number;
  /** 对应 v1 第一次 `$group`：按订单对各行 `total_price` 求和 */
  total_order_price: number;
  commodity: {
    id: string;
    name: string;
    desc: string | null;
    categoryId: string;
    unitId: string;
    deleted: boolean;
    createdAt: Date;
    updatedAt: Date;
  };
  category: Category;
  unit: Unit;
};

function dec(d: Prisma.Decimal): Prisma.Decimal {
  return new Prisma.Decimal(d.toString());
}

/**
 * 将 Prisma.Decimal 安全转为 number（用于响应里的 `price` 标量）。
 */
function decimalToNumber(d: Prisma.Decimal): number {
  return dec(d).toNumber();
}

/**
 * 对应 v1 `findAll` 聚合里 `$addFields.total_price`：`$round: { $multiply: [price, count] }`。
 * 先用 Decimal 做乘法再 `Math.round`，对应 Mongo 对乘积做单参 `$round`（四舍五入到整数）。
 */
export function lineRoundedTotal(price: Prisma.Decimal, count: number): number {
  return Math.round(dec(price).mul(count).toNumber());
}

/**
 * 对应 v1 管道末尾 `$addFields.origin_total_price`：`$multiply` 不经 $round。
 */
export function lineOriginTotal(price: Prisma.Decimal, count: number): number {
  return dec(price).mul(count).toNumber();
}

/**
 * 在内存中复现 v1 `order_commodity.controller.js` `findAll` 聚合管道：
 * 1) `$match` 已在外层查询保证 deleted=false；
 * 2) `$lookup` commodity/category/unit → Prisma `include`；
 * 3) `$addFields.total_price` → `lineRoundedTotal`；
 * 4) `$group` 按 order 求和 → `total_order_price`；
 * 5) `$group` 按 category 对行 `total_price` 求和 → `total_category_price`；
 * 6) `$sort: { 'category.name': 1 }` → 按分类名升序。
 */
export function aggregateOrderLinesForUi(
  rows: OrderLineWithRelations[]
): OrderLineRowForUi[] {
  const withRounded = rows.map((row) => ({
    row,
    total_price: lineRoundedTotal(row.price, row.count),
  }));

  const total_order_price = withRounded.reduce((s, x) => s + x.total_price, 0);

  const categoryIdToSum = new Map<string, number>();
  for (const { row, total_price } of withRounded) {
    const cid = row.commodity.category.id;
    categoryIdToSum.set(cid, (categoryIdToSum.get(cid) ?? 0) + total_price);
  }

  const sorted = [...withRounded].sort((a, b) =>
    a.row.commodity.category.name.localeCompare(
      b.row.commodity.category.name,
      "zh-CN"
    )
  );

  return sorted.map(({ row, total_price }) => {
    const c = row.commodity;
    return {
      id: row.id,
      orderId: row.orderId,
      commodityId: row.commodityId,
      count: row.count,
      price: decimalToNumber(row.price),
      desc: row.desc,
      deleted: row.deleted,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      total_price,
      origin_total_price: lineOriginTotal(row.price, row.count),
      total_category_price: categoryIdToSum.get(c.category.id) ?? 0,
      total_order_price,
      commodity: {
        id: c.id,
        name: c.name,
        desc: c.desc,
        categoryId: c.categoryId,
        unitId: c.unitId,
        deleted: c.deleted,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
      },
      category: c.category,
      unit: c.unit,
    };
  });
}
