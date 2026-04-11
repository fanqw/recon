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

  await prisma.$transaction([
    prisma.orderCommodity.deleteMany({}),
    prisma.order.deleteMany({}),
    prisma.commodity.deleteMany({}),
    prisma.category.deleteMany({}),
    prisma.unit.deleteMany({}),
    prisma.purchasePlace.deleteMany({}),
  ]);

  const category = await prisma.category.create({
    data: { name: "蔬菜", desc: "语义化样例：蔬菜类" },
  });
  const unit = await prisma.unit.create({
    data: { name: "公斤", desc: "语义化样例：重量单位" },
  });
  const purchasePlace = await prisma.purchasePlace.create({
    data: {
      place: "广州白云",
      marketName: "江南果菜批发市场",
      desc: "凌晨档口进货",
    },
  });
  const commodity = await prisma.commodity.create({
    data: {
      name: "西红柿",
      categoryId: category.id,
      unitId: unit.id,
      desc: "语义化样例：番茄",
    },
  });
  const order = await prisma.order.create({
    data: {
      name: "示例采购单-蔬菜",
      purchasePlaceId: purchasePlace.id,
      desc: "用于演示进货地关联",
    },
  });
  await prisma.orderCommodity.create({
    data: {
      orderId: order.id,
      commodityId: commodity.id,
      count: 10,
      price: "6.80",
      lineTotal: "68.00",
      desc: "语义化样例：当天特价",
    },
  });
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e: unknown) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
