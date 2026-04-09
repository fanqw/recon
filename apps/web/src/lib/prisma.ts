import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

/**
 * 应用内复用的 Prisma 客户端单例，避免开发模式热重载重复建连。
 */
export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({ log: ["error", "warn"] });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
