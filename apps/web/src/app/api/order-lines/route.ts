import { NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import {
  createOrderCommodityLine,
  createOrderCommodityLineTx,
} from "@/lib/order-lines/create-line";
import { lineRoundedTotal } from "@/lib/order-lines/aggregate";
import {
  resolveOrCreateCategory,
  resolveOrCreateCommodity,
  resolveOrCreateUnit,
  trimName,
} from "@/lib/master-data/resolve-for-order-line";

const postSchema = z.object({
  orderId: z.string().min(1),
  count: z.number().finite().refine((value) => value !== 0),
  price: z.union([z.number(), z.string()]),
  lineTotal: z.union([z.number(), z.string()]).optional(),
  desc: z.string().optional(),
  commodityId: z.string().optional(),
  commodityName: z.string().optional(),
  categoryId: z.string().optional(),
  categoryName: z.string().optional(),
  unitId: z.string().optional(),
  unitName: z.string().optional(),
});

async function guard() {
  try {
    await requireUser();
  } catch (e) {
    const status = (e as Error & { status?: number }).status ?? 401;
    return NextResponse.json({ error: "未授权" }, { status });
  }
  return null;
}

/**
 * POST /api/order-lines：在指定订单下新增明细；支持 commodityId 直连或主数据名称编排创建。
 */
export async function POST(req: Request) {
  const unauthorized = await guard();
  if (unauthorized) return unauthorized;
  const json = await req.json().catch(() => null);
  const parsed = postSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "请求体无效" }, { status: 400 });
  }

  const {
    orderId,
    count,
    desc,
    commodityId: commodityIdRaw,
    commodityName: commodityNameRaw,
    categoryId: categoryIdRaw,
    categoryName: categoryNameRaw,
    unitId: unitIdRaw,
    unitName: unitNameRaw,
  } = parsed.data;

  const price = new Prisma.Decimal(String(parsed.data.price));
  const baseline = lineRoundedTotal(price, count);
  const lineTotalDec =
    parsed.data.lineTotal !== undefined
      ? new Prisma.Decimal(String(parsed.data.lineTotal))
      : new Prisma.Decimal(baseline);

  const commodityIdTrimmed = commodityIdRaw?.trim();
  if (commodityIdTrimmed) {
    const [order, commodity] = await Promise.all([
      prisma.order.findFirst({ where: { id: orderId, deleted: false } }),
      prisma.commodity.findFirst({
        where: { id: commodityIdTrimmed, deleted: false },
      }),
    ]);
    if (!order || !commodity) {
      return NextResponse.json(
        { error: "订单或商品不存在或已删除" },
        { status: 400 },
      );
    }

    const item = await createOrderCommodityLine({
      orderId,
      commodityId: commodityIdTrimmed,
      count,
      price,
      lineTotal: lineTotalDec,
      desc,
    });

    return NextResponse.json({ item }, { status: 201 });
  }

  const commodityName = trimName(commodityNameRaw ?? "");
  if (!commodityName) {
    return NextResponse.json({ error: "商品名称不能为空" }, { status: 400 });
  }

  const order = await prisma.order.findFirst({
    where: { id: orderId, deleted: false },
  });
  if (!order) {
    return NextResponse.json({ error: "订单不存在或已删除" }, { status: 400 });
  }

  try {
    const item = await prisma.$transaction(async (tx) => {
      let category;
      const catId = categoryIdRaw?.trim();
      if (catId) {
        category = await tx.category.findFirst({
          where: { id: catId, deleted: false },
        });
        if (!category) {
          throw new Error("CATEGORY_NOT_FOUND");
        }
      } else {
        const cn = trimName(categoryNameRaw ?? "");
        if (!cn) {
          throw new Error("CATEGORY_NAME_EMPTY");
        }
        category = await resolveOrCreateCategory(tx, cn);
      }

      let unit;
      const uId = unitIdRaw?.trim();
      if (uId) {
        unit = await tx.unit.findFirst({
          where: { id: uId, deleted: false },
        });
        if (!unit) {
          throw new Error("UNIT_NOT_FOUND");
        }
      } else {
        const un = trimName(unitNameRaw ?? "");
        if (!un) {
          throw new Error("UNIT_NAME_EMPTY");
        }
        unit = await resolveOrCreateUnit(tx, un);
      }

      const commodity = await resolveOrCreateCommodity(tx, {
        name: commodityName,
        categoryId: category.id,
        unitId: unit.id,
      });

      return createOrderCommodityLineTx(tx, {
        orderId,
        commodityId: commodity.id,
        count,
        price,
        lineTotal: lineTotalDec,
        desc,
      });
    });

    return NextResponse.json({ item }, { status: 201 });
  } catch (e) {
    const msg = (e as Error).message;
    if (msg === "CATEGORY_NOT_FOUND" || msg === "UNIT_NOT_FOUND") {
      return NextResponse.json(
        { error: "分类或单位不存在或已删除" },
        { status: 400 },
      );
    }
    if (
      msg === "CATEGORY_NAME_EMPTY" ||
      msg === "UNIT_NAME_EMPTY"
    ) {
      return NextResponse.json(
        { error: "分类名称或单位名称不能为空" },
        { status: 400 },
      );
    }
    throw e;
  }
}
