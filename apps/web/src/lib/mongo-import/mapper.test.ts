import { Decimal128, ObjectId } from "bson";
import { describe, expect, it } from "vitest";
import {
  mapMongoCategory,
  mapMongoOrderCommodity,
  objectIdString,
} from "./mapper";

describe("objectIdString", () => {
  it("keeps Mongo ObjectId values as stable Prisma string IDs", () => {
    expect(objectIdString(new ObjectId("643968224a410a01a850b710"))).toBe(
      "643968224a410a01a850b710",
    );
  });
});

describe("mapMongoCategory", () => {
  it("maps v1 timestamp names and deletion state to the v2 Category shape", () => {
    const createdAt = new Date("2023-04-14T14:50:10.125Z");
    const updatedAt = new Date("2023-04-14T15:22:18.423Z");

    expect(
      mapMongoCategory({
        _id: new ObjectId("643968224a410a01a850b710"),
        name: " 水果 ",
        desc: "水果类",
        deleted: true,
        create_at: createdAt,
        update_at: updatedAt,
      }),
    ).toEqual({
      id: "643968224a410a01a850b710",
      name: "水果",
      desc: "水果类",
      deleted: true,
      createdAt,
      updatedAt,
    });
  });
});

describe("mapMongoOrderCommodity", () => {
  it("converts Decimal128 prices and computes the required v2 line total", () => {
    expect(
      mapMongoOrderCommodity({
        _id: new ObjectId("64be33db8416020561fbc7ad"),
        order_id: new ObjectId("64be32e48416020561fbc799"),
        commodity_id: new ObjectId("64be2f398416020561fbc6f2"),
        count: 46,
        price: Decimal128.fromString("2.80"),
        desc: "",
        deleted: false,
        create_at: new Date("2023-07-24T08:18:35.711Z"),
        update_at: new Date("2023-07-25T01:33:49.787Z"),
      }),
    ).toMatchObject({
      id: "64be33db8416020561fbc7ad",
      orderId: "64be32e48416020561fbc799",
      commodityId: "64be2f398416020561fbc6f2",
      count: "46",
      price: "2.80",
      lineTotal: "128.80",
      desc: "",
      deleted: false,
    });
  });

  it("preserves Decimal128 counts instead of rounding production quantities", () => {
    expect(
      mapMongoOrderCommodity({
        _id: new ObjectId("64bf38e4f6ebf006c67f9a76"),
        order_id: new ObjectId("64bf382cb4d12969115d8c76"),
        commodity_id: new ObjectId("64bf3790b4d12969115d8c4c"),
        count: Decimal128.fromString("58.999"),
        price: Decimal128.fromString("4.288"),
        deleted: false,
      }),
    ).toMatchObject({
      count: "58.999",
      lineTotal: "252.99",
    });
  });
});
