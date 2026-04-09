import type { Prisma } from "@prisma/client";

/**
 * 去除主数据名称首尾空白（与入库前规则一致）。
 */
export function trimName(s: string): string {
  return s.trim();
}

/**
 * 在未删除分类中按 trim 后名称查找或创建（须在事务内调用；`name` 调用方已保证非空）。
 */
export async function resolveOrCreateCategory(
  tx: Prisma.TransactionClient,
  name: string,
) {
  const trimmed = trimName(name);
  const existing = await tx.category.findFirst({
    where: { name: trimmed, deleted: false },
  });
  if (existing) return existing;
  return tx.category.create({ data: { name: trimmed } });
}

/**
 * 在未删除单位中按 trim 后名称查找或创建。
 */
export async function resolveOrCreateUnit(
  tx: Prisma.TransactionClient,
  name: string,
) {
  const trimmed = trimName(name);
  const existing = await tx.unit.findFirst({
    where: { name: trimmed, deleted: false },
  });
  if (existing) return existing;
  return tx.unit.create({ data: { name: trimmed } });
}

/**
 * 在未删除商品中按「名称 + 分类 + 单位」查找或创建（`name` 已 trim 且非空）。
 */
export async function resolveOrCreateCommodity(
  tx: Prisma.TransactionClient,
  input: { name: string; categoryId: string; unitId: string },
) {
  const name = trimName(input.name);
  const existing = await tx.commodity.findFirst({
    where: {
      name,
      categoryId: input.categoryId,
      unitId: input.unitId,
      deleted: false,
    },
  });
  if (existing) return existing;
  return tx.commodity.create({
    data: {
      name,
      categoryId: input.categoryId,
      unitId: input.unitId,
    },
  });
}
