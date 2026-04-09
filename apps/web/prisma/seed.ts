/**
 * Prisma 数据库种子脚本入口。
 * 在 `prisma/schema.prisma` 就绪并执行 `prisma generate` 后可在此写入初始数据。
 */
async function main(): Promise<void> {
  // 占位：无 schema 时不执行数据库操作
}

main().catch((e: unknown) => {
  console.error(e);
  process.exit(1);
});
