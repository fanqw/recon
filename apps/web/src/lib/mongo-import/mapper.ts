import { Decimal128, ObjectId } from "bson";

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
