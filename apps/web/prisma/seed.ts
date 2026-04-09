import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

/**
 * 初始化种子数据：写入可登录的管理员账号（admin / admin123）及贴近业务的演示分类、单位、商品（水果 / 斤 / 苹果）。
 */
async function main(): Promise<void> {
  const passwordHash = await bcrypt.hash("admin123", 10);
  await prisma.user.upsert({
    where: { username: "admin" },
    update: { passwordHash },
    create: { username: "admin", passwordHash },
  });

  let cat = await prisma.category.findFirst({
    where: { name: "水果", deleted: false },
  });
  if (!cat) {
    cat = await prisma.category.create({
      data: { name: "水果", desc: "种子数据：水果类" },
    });
  }

  let unit = await prisma.unit.findFirst({
    where: { name: "斤", deleted: false },
  });
  if (!unit) {
    unit = await prisma.unit.create({
      data: { name: "斤", desc: "种子数据：重量单位" },
    });
  }

  const existingApple = await prisma.commodity.findFirst({
    where: {
      name: "苹果",
      deleted: false,
      categoryId: cat.id,
      unitId: unit.id,
    },
  });
  if (!existingApple) {
    await prisma.commodity.create({
      data: {
        name: "苹果",
        categoryId: cat.id,
        unitId: unit.id,
        desc: "种子数据：苹果",
      },
    });
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e: unknown) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
