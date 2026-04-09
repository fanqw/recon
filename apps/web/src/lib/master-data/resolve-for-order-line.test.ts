import { describe, expect, it, vi } from "vitest";
import {
  resolveOrCreateCategory,
  resolveOrCreateCommodity,
  resolveOrCreateUnit,
  trimName,
} from "./resolve-for-order-line";

describe("trimName", () => {
  it("去除首尾空白", () => {
    expect(trimName("  水果  ")).toBe("水果");
  });
});

describe("resolveOrCreateCategory", () => {
  it("按 trim 后名称命中则复用，不创建", async () => {
    const existing = { id: "c1", name: "水果" };
    const tx = {
      category: {
        findFirst: vi.fn().mockResolvedValue(existing),
        create: vi.fn(),
      },
    };
    const r = await resolveOrCreateCategory(tx as never, "  水果  ");
    expect(r).toBe(existing);
    expect(tx.category.create).not.toHaveBeenCalled();
  });

  it("未命中则创建且写入 trim 后名称", async () => {
    const created = { id: "c2", name: "蔬菜" };
    const tx = {
      category: {
        findFirst: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockResolvedValue(created),
      },
    };
    const r = await resolveOrCreateCategory(tx as never, "  蔬菜\t");
    expect(r).toBe(created);
    expect(tx.category.create).toHaveBeenCalledWith({
      data: { name: "蔬菜" },
    });
  });
});

describe("resolveOrCreateUnit", () => {
  it("未命中则创建", async () => {
    const created = { id: "u1", name: "斤" };
    const tx = {
      unit: {
        findFirst: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockResolvedValue(created),
      },
    };
    const r = await resolveOrCreateUnit(tx as never, "斤");
    expect(r).toBe(created);
    expect(tx.unit.create).toHaveBeenCalledWith({ data: { name: "斤" } });
  });
});

describe("resolveOrCreateCommodity", () => {
  it("三元组命中则复用", async () => {
    const existing = {
      id: "g1",
      name: "苹果",
      categoryId: "c1",
      unitId: "u1",
    };
    const tx = {
      commodity: {
        findFirst: vi.fn().mockResolvedValue(existing),
        create: vi.fn(),
      },
    };
    const r = await resolveOrCreateCommodity(tx as never, {
      name: "苹果",
      categoryId: "c1",
      unitId: "u1",
    });
    expect(r).toBe(existing);
    expect(tx.commodity.create).not.toHaveBeenCalled();
  });

  it("未命中则创建且名称经 trim", async () => {
    const created = {
      id: "g2",
      name: "梨",
      categoryId: "c1",
      unitId: "u1",
    };
    const tx = {
      commodity: {
        findFirst: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockResolvedValue(created),
      },
    };
    const r = await resolveOrCreateCommodity(tx as never, {
      name: "  梨  ",
      categoryId: "c1",
      unitId: "u1",
    });
    expect(r).toBe(created);
    expect(tx.commodity.create).toHaveBeenCalledWith({
      data: { name: "梨", categoryId: "c1", unitId: "u1" },
    });
  });
});
