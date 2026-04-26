import { Decimal128, ObjectId } from "bson";
import { createHash } from "node:crypto";

type MongoId = ObjectId | string | { toHexString(): string };

type MongoBase = {
  _id: MongoId;
  desc?: string | null;
  deleted?: boolean;
  create_at?: Date;
  update_at?: Date;
  createdAt?: Date;
  updatedAt?: Date;
};

type MongoNamed = MongoBase & {
  name: string;
};

type MongoOrderLike = {
  desc?: string | null;
};

type MongoCommodity = MongoNamed & {
  category_id: MongoId;
  unit_id: MongoId;
};

type MongoOrderCommodity = MongoBase & {
  order_id: MongoId;
  commodity_id: MongoId;
  count: number | Decimal128 | string;
  price: number | Decimal128 | string;
};

export function objectIdString(value: MongoId): string {
  if (typeof value === "string") return value;
  if (value instanceof ObjectId) return value.toHexString();
  return value.toHexString();
}

function trimName(value: string): string {
  return value.trim();
}

function createdAt(row: MongoBase): Date {
  return row.create_at ?? row.createdAt ?? new Date(0);
}

function updatedAt(row: MongoBase): Date {
  return row.update_at ?? row.updatedAt ?? createdAt(row);
}

function priceString(value: MongoOrderCommodity["price"]): string {
  if (value instanceof Decimal128) return value.toString();
  if (typeof value === "number") return value.toString();
  return value;
}

function decimalString(value: number | Decimal128 | string): string {
  if (value instanceof Decimal128) return value.toString();
  if (typeof value === "number") return value.toString();
  return value;
}

function fixedTwo(value: number): string {
  return (Math.round((value + Number.EPSILON) * 100) / 100).toFixed(2);
}

function normalizeRemark(value: string | null | undefined): string {
  return (value ?? "").replace(/\s+/g, " ").trim();
}

function stablePurchasePlaceId(place: string, marketName: string): string {
  const hash = createHash("sha1").update(`${place}|${marketName}`).digest("hex").slice(0, 6);
  return `legacy-place-${hash}`;
}

function splitKnownTrailingPlace(text: string): { place: string; marketName: string } | null {
  const normalized = text.replace(/[，,。；;:：()（）]/g, " ").replace(/\s+/g, " ").trim();
  if (!normalized) return null;

  const knownPlaces = ["晋城", "洛阳", "端氏", "嘉峰"];
  for (const place of knownPlaces) {
    if (!normalized.endsWith(place)) continue;
    const prefix = normalized.slice(0, -place.length).trim();
    return { place, marketName: prefix || "生产 MongoDB 导入" };
  }

  const parts = normalized.split(" ").filter(Boolean);
  if (parts.length >= 2) {
    const place = parts[parts.length - 1];
    return { place, marketName: parts.slice(0, -1).join(" ") };
  }

  if (knownPlaces.includes(normalized)) {
    return { place: normalized, marketName: "生产 MongoDB 导入" };
  }

  return null;
}

function removeDateAndNoise(text: string): string {
  return text
    .replace(/\d{2,4}\s*年\s*\d{1,2}\s*月\s*\d{1,2}\s*(?:日|号)?/g, " ")
    .replace(/(?<!\d)\d{2,4}\.\d{1,2}\.\d{1,2}(?!\d)/g, " ")
    .replace(/从|进货|订单|测试|蔬菜单|水果单|其他杂项/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function deriveMongoOrderPurchasePlace(row: MongoOrderLike) {
  const originalRemark = normalizeRemark(row.desc);
  const cleaned = removeDateAndNoise(originalRemark);
  const parsed = splitKnownTrailingPlace(cleaned);
  const place = parsed?.place ?? "历史导入";
  const marketName = parsed?.marketName ?? "生产 MongoDB 导入";

  return {
    id: stablePurchasePlaceId(place, marketName),
    place,
    marketName,
    desc: parsed
      ? `由生产订单备注拆解：${originalRemark}`
      : `生产订单备注未能拆解为进货地：${originalRemark || "空备注"}`,
  };
}

export function mapMongoCategory(row: MongoNamed) {
  return {
    id: objectIdString(row._id),
    name: trimName(row.name),
    desc: row.desc ?? null,
    deleted: row.deleted ?? false,
    createdAt: createdAt(row),
    updatedAt: updatedAt(row),
  };
}

export const mapMongoUnit = mapMongoCategory;

export function mapMongoCommodity(row: MongoCommodity) {
  return {
    ...mapMongoCategory(row),
    categoryId: objectIdString(row.category_id),
    unitId: objectIdString(row.unit_id),
  };
}

export function mapMongoOrder(
  row: MongoNamed,
  purchasePlaceId: string,
) {
  return {
    ...mapMongoCategory(row),
    purchasePlaceId,
  };
}

export function mapMongoOrderCommodity(row: MongoOrderCommodity) {
  const price = priceString(row.price);

  return {
    id: objectIdString(row._id),
    orderId: objectIdString(row.order_id),
    commodityId: objectIdString(row.commodity_id),
    count: decimalString(row.count),
    price,
    lineTotal: fixedTwo(Number(price) * Number(decimalString(row.count))),
    desc: row.desc ?? null,
    deleted: row.deleted ?? false,
    createdAt: createdAt(row),
    updatedAt: updatedAt(row),
  };
}
