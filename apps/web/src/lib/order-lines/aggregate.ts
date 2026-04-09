import { Prisma } from "@prisma/client";
import type { Category, Commodity, OrderCommodity, Unit } from "@prisma/client";

/** Prisma 查询返回的单条明细行（含商品、分类、单位）。 */
export type OrderLineWithRelations = OrderCommodity & {
  commodity: Commodity & { category: Category; unit: Unit };
};

/**
 * GET 订单明细表格用行结构；金额字段名与 v1 / Task 14 约定一致（snake_case）。
 * `total_price` 为舍入基准（单价×数量四舍五入）；`line_total` 为持久化行金额；合计列对 `line_total` 求和。
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
  /** 舍入基准：`lineRoundedTotal(price, count)`，用于与 `line_total` 比较是否标红 */
  total_price: number;
  /** 持久化行金额（展示与分类/订单合计均用此字段） */
  line_total: number;
  /** 对应 v1 管道末尾 `$addFields.origin_total_price`：`$multiply` 不经 $round */
  origin_total_price: number;
  /** 按分类对各行 `line_total` 求和 */
  total_category_price: number;
  /** 按订单对各行 `line_total` 求和 */
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
 * 在内存中复现订单明细列表聚合：
 * 每行 `total_price` = 舍入基准；`line_total` = 持久化值；`total_category_price` / `total_order_price` 对 `line_total` 求和。
 */
export function aggregateOrderLinesForUi(
  rows: OrderLineWithRelations[],
): OrderLineRowForUi[] {
  const enriched = rows.map((row) => {
    const total_price = lineRoundedTotal(row.price, row.count);
    const line_total = decimalToNumber(row.lineTotal);
    return { row, total_price, line_total };
  });

  const total_order_price = enriched.reduce((s, x) => s + x.line_total, 0);

  const categoryIdToSum = new Map<string, number>();
  for (const { row, line_total } of enriched) {
    const cid = row.commodity.category.id;
    categoryIdToSum.set(cid, (categoryIdToSum.get(cid) ?? 0) + line_total);
  }

  const sorted = [...enriched].sort((a, b) =>
    a.row.commodity.category.name.localeCompare(
      b.row.commodity.category.name,
      "zh-CN",
    ),
  );

  return sorted.map(({ row, total_price, line_total }) => {
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
      line_total,
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
