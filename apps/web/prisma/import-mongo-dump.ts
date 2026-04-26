import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { gunzipSync } from "node:zlib";
import { deserialize } from "bson";
import {
  deriveMongoOrderPurchasePlace,
  mapMongoCategory,
  mapMongoCommodity,
  mapMongoOrder,
  mapMongoOrderCommodity,
  mapMongoUnit,
  objectIdString,
} from "../src/lib/mongo-import/mapper";

type MongoDoc = Record<string, unknown>;

const defaultDumpDir = "/Users/fanqw/Documents/生产环境mongo db/repository";

function loadEnvFile(path: string): void {
  if (!existsSync(path)) return;

  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;

    const [key, ...rest] = trimmed.split("=");
    if (process.env[key]) continue;
    process.env[key] = rest.join("=").trim().replace(/^"|"$/g, "");
  }
}

function readBsonDump(collection: string, dumpDir: string): MongoDoc[] {
  const filePath = join(dumpDir, `${collection}.bson.gz`);
  const buffer = gunzipSync(readFileSync(filePath));
  const docs: MongoDoc[] = [];

  for (let offset = 0; offset < buffer.length; ) {
    const size = buffer.readInt32LE(offset);
    docs.push(deserialize(buffer.subarray(offset, offset + size)));
    offset += size;
  }

  return docs;
}

function batches<T>(items: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    result.push(items.slice(index, index + size));
  }
  return result;
}

function shouldReplaceBusinessData(): boolean {
  return process.argv.includes("--replace");
}

async function main(): Promise<void> {
  loadEnvFile(resolve(process.cwd(), ".env"));

  const dumpDir = resolve(
    process.argv.find((arg) => arg.startsWith("--dump-dir="))?.split("=")[1] ??
      defaultDumpDir,
  );
  const { PrismaClient } = await import("@prisma/client");
  const prisma = new PrismaClient();

  const categories = readBsonDump("category", dumpDir).map((doc) =>
    mapMongoCategory(doc as Parameters<typeof mapMongoCategory>[0]),
  );
  const units = readBsonDump("unit", dumpDir).map((doc) =>
    mapMongoUnit(doc as Parameters<typeof mapMongoUnit>[0]),
  );
  const commodities = readBsonDump("commodity", dumpDir).map((doc) =>
    mapMongoCommodity(doc as Parameters<typeof mapMongoCommodity>[0]),
  );
  const rawOrders = readBsonDump("order", dumpDir);
  const purchasePlaceById = new Map<
    string,
    ReturnType<typeof deriveMongoOrderPurchasePlace>
  >();
  const orders = rawOrders.map((doc) => {
    const purchasePlace = deriveMongoOrderPurchasePlace(
      doc as Parameters<typeof deriveMongoOrderPurchasePlace>[0],
    );
    purchasePlaceById.set(purchasePlace.id, purchasePlace);
    return mapMongoOrder(
      doc as Parameters<typeof mapMongoOrder>[0],
      purchasePlace.id,
    );
  });
  const dumpUsers = readBsonDump("users", dumpDir);

  const validCommodityIds = new Set(commodities.map((item) => item.id));
  const validOrderIds = new Set(orders.map((item) => item.id));
  const rawOrderCommodities = readBsonDump("order_commodity", dumpDir);
  const skippedOrderCommodities = rawOrderCommodities.filter((doc) => {
    const orderId = objectIdString(
      doc.order_id as Parameters<typeof objectIdString>[0],
    );
    const commodityId = objectIdString(
      doc.commodity_id as Parameters<typeof objectIdString>[0],
    );
    return !validOrderIds.has(orderId) || !validCommodityIds.has(commodityId);
  });
  const orderCommodities = rawOrderCommodities
    .filter((doc) => !skippedOrderCommodities.includes(doc))
    .map((doc) =>
      mapMongoOrderCommodity(
        doc as Parameters<typeof mapMongoOrderCommodity>[0],
      ),
    );

  await prisma.$transaction(
    async (tx) => {
      if (shouldReplaceBusinessData()) {
        await tx.$executeRawUnsafe(`
          TRUNCATE TABLE
            "OrderCommodity",
            "Order",
            "Commodity",
            "Category",
            "Unit",
            "PurchasePlace"
          RESTART IDENTITY CASCADE
        `);
      }

      await tx.category.createMany({
        data: categories,
        skipDuplicates: true,
      });
      await tx.unit.createMany({
        data: units,
        skipDuplicates: true,
      });
      await tx.purchasePlace.createMany({
        data: Array.from(purchasePlaceById.values()).map((item) => ({
          ...item,
          createdAt: new Date(0),
          updatedAt: new Date(0),
        })),
        skipDuplicates: true,
      });
      await tx.commodity.createMany({
        data: commodities,
        skipDuplicates: true,
      });
      await tx.order.createMany({
        data: orders,
        skipDuplicates: true,
      });

      for (const chunk of batches(orderCommodities, 1_000)) {
        await tx.orderCommodity.createMany({
          data: chunk,
          skipDuplicates: true,
        });
      }
    },
    { timeout: 60_000 },
  );

  await prisma.$disconnect();

  console.log(
    JSON.stringify(
      {
        imported: {
          users: 0,
          categories: categories.length,
          units: units.length,
          purchasePlaces: purchasePlaceById.size,
          commodities: commodities.length,
          orders: orders.length,
          orderCommodities: orderCommodities.length,
        },
        preserved: {
          users: "现有用户未清空、未覆盖",
        },
        skipped: {
          users: dumpUsers.length,
          orderCommodities: skippedOrderCommodities.map((doc) => ({
            id: objectIdString(
              doc._id as Parameters<typeof objectIdString>[0],
            ),
            reason: "missing order or commodity reference",
          })),
        },
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
