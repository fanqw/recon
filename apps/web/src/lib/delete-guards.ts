import { NextResponse } from "next/server";
import { prisma } from "./prisma";
import { messageForDeleteBlockCode } from "./delete-block-codes";

function blockResponse(code: Parameters<typeof messageForDeleteBlockCode>[0]): NextResponse {
  return NextResponse.json(
    { code, error: messageForDeleteBlockCode(code) },
    { status: 409 }
  );
}

export async function guardCategoryDelete(id: string): Promise<NextResponse | null> {
  const inUse = await prisma.commodity.findFirst({
    where: { categoryId: id, deleted: false },
    select: { id: true },
  });
  return inUse ? blockResponse("CATEGORY_IN_USE") : null;
}

export async function guardUnitDelete(id: string): Promise<NextResponse | null> {
  const inUse = await prisma.commodity.findFirst({
    where: { unitId: id, deleted: false },
    select: { id: true },
  });
  return inUse ? blockResponse("UNIT_IN_USE") : null;
}

export async function guardCommodityDelete(id: string): Promise<NextResponse | null> {
  const inUse = await prisma.orderCommodity.findFirst({
    where: { commodityId: id, deleted: false },
    select: { id: true },
  });
  return inUse ? blockResponse("COMMODITY_IN_USE") : null;
}

export async function guardPurchasePlaceDelete(id: string): Promise<NextResponse | null> {
  const inUse = await prisma.order.findFirst({
    where: { purchasePlaceId: id, deleted: false },
    select: { id: true },
  });
  return inUse ? blockResponse("PURCHASE_PLACE_IN_USE") : null;
}

export async function guardOrderDelete(id: string): Promise<NextResponse | null> {
  const hasLines = await prisma.orderCommodity.findFirst({
    where: { orderId: id, deleted: false },
    select: { id: true },
  });
  return hasLines ? blockResponse("ORDER_HAS_LINES") : null;
}
