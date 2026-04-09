import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

/**
 * 初始化种子数据：写入可登录的管理员账号（admin / admin123）及演示用分类、单位、商品。
 */
async function main(): Promise<void> {
  const passwordHash = await bcrypt.hash("admin123", 10);
  await prisma.user.upsert({
    where: { username: "admin" },
    update: { passwordHash },
    create: { username: "admin", passwordHash },
  });

  const cat = await prisma.category.create({
    data: { name: "示例分类", desc: "seed" },
  });
  const unit = await prisma.unit.create({
    data: { name: "件", desc: "seed" },
  });
  await prisma.commodity.create({
    data: {
      name: "示例商品",
      categoryId: cat.id,
      unitId: unit.id,
      desc: "seed",
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
