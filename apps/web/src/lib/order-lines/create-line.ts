import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type CreateOrderLineInput = {
  orderId: string;
  commodityId: string;
  count: number;
  price: Prisma.Decimal;
  desc?: string;
};

/**
 * 创建订单明细行（调用方已校验订单与商品存在且未删除）。
 */
export async function createOrderCommodityLine(input: CreateOrderLineInput) {
  const { orderId, commodityId, count, price, desc } = input;
  return prisma.orderCommodity.create({
    data: {
      orderId,
      commodityId,
      count,
      price,
      desc,
    },
    include: {
      commodity: { include: { category: true, unit: true } },
    },
  });
}
