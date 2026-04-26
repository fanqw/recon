import { describe, expect, it } from "vitest";
import {
  validateCommodityFields,
  validateOrderLineFields,
  validateOrderFields,
  validatePurchasePlaceFields,
  validateRequiredName,
} from "./master-data-validation";

describe("validateRequiredName", () => {
  it("returns a field error when the name is blank", () => {
    expect(validateRequiredName("  ")).toEqual({
      name: "请输入名称",
    });
  });

  it("returns no field error when the name is present", () => {
    expect(validateRequiredName("水果")).toEqual({});
  });
});

describe("validateCommodityFields", () => {
  it("returns field errors when name, category, or unit is blank", () => {
    expect(
      validateCommodityFields({
        name: " ",
        categoryId: "",
        unitId: "  ",
      }),
    ).toEqual({
      name: "请输入商品名称",
      categoryId: "请选择分类",
      unitId: "请选择单位",
    });
  });

  it("returns no field errors when all required commodity fields are present", () => {
    expect(
      validateCommodityFields({
        name: "苹果",
        categoryId: "c1",
        unitId: "u1",
      }),
    ).toEqual({});
  });
});

describe("validatePurchasePlaceFields", () => {
  it("returns field errors when place or market name is blank", () => {
    expect(
      validatePurchasePlaceFields({
        place: " ",
        marketName: "",
      }),
    ).toEqual({
      place: "请输入进货地",
      marketName: "请输入市场名称",
    });
  });

  it("returns no field errors when place and market name are present", () => {
    expect(
      validatePurchasePlaceFields({
        place: "武汉",
        marketName: "中心港市场",
      }),
    ).toEqual({});
  });
});

describe("validateOrderFields", () => {
  it("returns field errors when order name, place, or market name is blank", () => {
    expect(
      validateOrderFields({
        name: " ",
        purchasePlace: "",
        marketName: "",
      }),
    ).toEqual({
      name: "请输入订单名称",
      purchasePlace: "请输入进货地",
      marketName: "请输入市场名称",
    });
  });

  it("returns no field errors when order name, place, and market name are present", () => {
    expect(
      validateOrderFields({
        name: "武汉到货单",
        purchasePlace: "武汉",
        marketName: "白沙洲农副产品大市场",
      }),
    ).toEqual({});
  });
});

describe("validateOrderLineFields", () => {
  it("returns field errors for missing master data and invalid numeric inputs", () => {
    expect(
      validateOrderLineFields({
        commoditySelected: false,
        categorySelected: false,
        unitSelected: false,
        lineCount: "0",
        linePrice: "",
        lineTotal: "",
      }),
    ).toEqual({
      commodity: "请选择商品或输入商品名称",
      category: "请选择分类或输入分类名称",
      unit: "请选择单位或输入单位名称",
      count: "数量不能为 0",
      price: "请输入单价",
      lineTotal: "请输入总金额",
    });
  });

  it("returns no field errors when all order line fields are valid", () => {
    expect(
      validateOrderLineFields({
        commoditySelected: true,
        categorySelected: true,
        unitSelected: true,
        lineCount: "2",
        linePrice: "3.5",
        lineTotal: "7",
      }),
    ).toEqual({});
  });

  it("allows refund lines with negative price and line total", () => {
    expect(
      validateOrderLineFields({
        commoditySelected: true,
        categorySelected: true,
        unitSelected: true,
        lineCount: "2",
        linePrice: "-15",
        lineTotal: "-30",
      }),
    ).toEqual({});
  });

  it("allows decimal and negative non-zero quantities for production adjustments", () => {
    expect(
      validateOrderLineFields({
        commoditySelected: true,
        categorySelected: true,
        unitSelected: true,
        lineCount: "-1.5",
        linePrice: "20",
        lineTotal: "-30",
      }),
    ).toEqual({});
  });
});
