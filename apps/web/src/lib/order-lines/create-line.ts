import type { Prisma, PrismaClient } from "@prisma/client";
import { Prisma as PrismaNS } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { lineRoundedTotal } from "@/lib/order-lines/aggregate";

export type CreateOrderLineInput = {
  orderId: string;
  commodityId: string;
  count: number;
  price: Prisma.Decimal;
  /** 省略时按 `lineRoundedTotal(price, count)` 填入 */
  lineTotal?: Prisma.Decimal;
  desc?: string;
};

/**
 * 在事务或根客户端上创建订单明细行（调用方已校验订单与商品存在且未删除）。
 */
export async function createOrderCommodityLineTx(
  db: Pick<PrismaClient, "orderCommodity">,
  input: CreateOrderLineInput,
) {
  const { orderId, commodityId, count, price, desc } = input;
  const lineTotal =
    input.lineTotal ??
    new PrismaNS.Decimal(lineRoundedTotal(price, count));
  return db.orderCommodity.create({
    data: {
      orderId,
      commodityId,
      count,
      price,
      lineTotal,
      desc,
    },
    include: {
      commodity: { include: { category: true, unit: true } },
    },
  });
}

/**
 * 创建订单明细行（调用方已校验订单与商品存在且未删除）。
 */
export async function createOrderCommodityLine(input: CreateOrderLineInput) {
  return createOrderCommodityLineTx(prisma, input);
}
