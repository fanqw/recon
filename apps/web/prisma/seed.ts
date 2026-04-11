import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

/**
 * 初始化种子数据：
 * 1) 保留管理员账号（admin / admin123）
 * 2) 清空历史业务数据（订单、明细、主数据）
 * 3) 写入语义化中文 mock 数据（含进货地与订单样例）
 */
async function main(): Promise<void> {
  const passwordHash = await bcrypt.hash("admin123", 10);
  await prisma.user.upsert({
    where: { username: "admin" },
    update: { passwordHash },
    create: { username: "admin", passwordHash },
  });
  await prisma.user.deleteMany({
    where: { username: { not: "admin" } },
  });

  await prisma.$transaction([
    prisma.orderCommodity.deleteMany({}),
    prisma.order.deleteMany({}),
    prisma.commodity.deleteMany({}),
    prisma.category.deleteMany({}),
    prisma.unit.deleteMany({}),
    prisma.purchasePlace.deleteMany({}),
  ]);

  const [waterCategory, vegetableCategory, groceryCategory, meatCategory] =
    await Promise.all([
      prisma.category.create({
        data: { name: "水", desc: "语义化样例：水果类" },
      }),
      prisma.category.create({
        data: { name: "蔬", desc: "语义化样例：蔬菜类" },
      }),
      prisma.category.create({
        data: { name: "副", desc: "语义化样例：副食类" },
      }),
      prisma.category.create({
        data: { name: "肉", desc: "语义化样例：肉类" },
      }),
    ]);

  const [jinUnit, jianUnit, boxUnit] = await Promise.all([
    prisma.unit.create({
      data: { name: "斤", desc: "语义化样例：散称重量单位" },
    }),
    prisma.unit.create({
      data: { name: "件", desc: "语义化样例：按件计量" },
    }),
    prisma.unit.create({
      data: { name: "箱", desc: "语义化样例：整箱计量" },
    }),
  ]);

  const [wuhanPlace, luoyangPlace] = await Promise.all([
    prisma.purchasePlace.create({
      data: {
        place: "武汉",
        marketName: "中心港市场",
        desc: "华中果蔬调拨样例",
      },
    }),
    prisma.purchasePlace.create({
      data: {
        place: "洛阳",
        marketName: "宏进市场",
        desc: "西北副食调拨样例",
      },
    }),
  ]);

  const [apple, lettuce, rice, noodle, pork] = await Promise.all([
    prisma.commodity.create({
      data: {
        name: "苹果",
        categoryId: waterCategory.id,
        unitId: jinUnit.id,
        desc: "语义化样例：水果",
      },
    }),
    prisma.commodity.create({
      data: {
        name: "生菜",
        categoryId: vegetableCategory.id,
        unitId: jinUnit.id,
        desc: "语义化样例：叶菜",
      },
    }),
    prisma.commodity.create({
      data: {
        name: "米",
        categoryId: groceryCategory.id,
        unitId: jianUnit.id,
        desc: "语义化样例：袋装主食",
      },
    }),
    prisma.commodity.create({
      data: {
        name: "面",
        categoryId: groceryCategory.id,
        unitId: boxUnit.id,
        desc: "语义化样例：面食原料",
      },
    }),
    prisma.commodity.create({
      data: {
        name: "猪肉",
        categoryId: meatCategory.id,
        unitId: jinUnit.id,
        desc: "语义化样例：鲜肉",
      },
    }),
  ]);

  const orderOne = await prisma.order.create({
    data: {
      name: "武汉中心港到货单",
      purchasePlaceId: wuhanPlace.id,
      desc: "水果与蔬菜联调样本",
    },
  });
  const orderTwo = await prisma.order.create({
    data: {
      name: "洛阳宏进备货单",
      purchasePlaceId: luoyangPlace.id,
      desc: "副食与肉类联调样本",
    },
  });

  await prisma.orderCommodity.createMany({
    data: [
      {
        orderId: orderOne.id,
        commodityId: apple.id,
        count: 20,
        price: "3.60",
        lineTotal: "72.00",
        desc: "武汉到货：苹果",
      },
      {
        orderId: orderOne.id,
        commodityId: lettuce.id,
        count: 8,
        price: "4.50",
        lineTotal: "36.00",
        desc: "武汉到货：生菜",
      },
      {
        orderId: orderTwo.id,
        commodityId: rice.id,
        count: 6,
        price: "92.00",
        lineTotal: "552.00",
        desc: "洛阳到货：米",
      },
      {
        orderId: orderTwo.id,
        commodityId: noodle.id,
        count: 10,
        price: "18.50",
        lineTotal: "185.00",
        desc: "洛阳到货：面",
      },
      {
        orderId: orderTwo.id,
        commodityId: pork.id,
        count: 12,
        price: "14.80",
        lineTotal: "177.60",
        desc: "洛阳到货：猪肉",
      },
    ],
  });
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e: unknown) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
