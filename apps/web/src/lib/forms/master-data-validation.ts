export function validateRequiredName(name: string) {
  if (!name.trim()) {
    return {
      name: "请输入名称",
    };
  }

  return {};
}

type CommodityFieldValues = {
  name: string;
  categoryId: string;
  unitId: string;
};

type CommodityFieldErrors = Partial<Record<keyof CommodityFieldValues, string>>;

export function validateCommodityFields(values: CommodityFieldValues): CommodityFieldErrors {
  const errors: CommodityFieldErrors = {};

  if (!values.name.trim()) {
    errors.name = "请输入商品名称";
  }

  if (!values.categoryId.trim()) {
    errors.categoryId = "请选择分类";
  }

  if (!values.unitId.trim()) {
    errors.unitId = "请选择单位";
  }

  return errors;
}

type PurchasePlaceFieldValues = {
  place: string;
  marketName: string;
};

type PurchasePlaceFieldErrors = Partial<Record<keyof PurchasePlaceFieldValues, string>>;

export function validatePurchasePlaceFields(
  values: PurchasePlaceFieldValues,
): PurchasePlaceFieldErrors {
  const errors: PurchasePlaceFieldErrors = {};

  if (!values.place.trim()) {
    errors.place = "请输入进货地";
  }

  if (!values.marketName.trim()) {
    errors.marketName = "请输入市场名称";
  }

  return errors;
}

type OrderFieldValues = {
  name: string;
  purchasePlace: string;
  marketName: string;
};

type OrderFieldErrors = Partial<Record<keyof OrderFieldValues, string>>;

export function validateOrderFields(values: OrderFieldValues): OrderFieldErrors {
  const errors: OrderFieldErrors = {};

  if (!values.name.trim()) {
    errors.name = "请输入订单名称";
  }

  // 进货地与市场名称为选填，但若填了其中一个，另一个也必须填
  const hasPlace = values.purchasePlace.trim().length > 0;
  const hasMarket = values.marketName.trim().length > 0;
  if (hasPlace && !hasMarket) {
    errors.marketName = "请输入市场名称";
  }
  if (hasMarket && !hasPlace) {
    errors.purchasePlace = "请输入进货地";
  }

  return errors;
}

type OrderLineFieldValues = {
  commoditySelected: boolean;
  categorySelected: boolean;
  unitSelected: boolean;
  lineCount: string;
  linePrice: string;
  lineTotal: string;
};

type OrderLineFieldErrors = Partial<
  Record<"commodity" | "category" | "unit" | "count" | "price" | "lineTotal", string>
>;

export function validateOrderLineFields(values: OrderLineFieldValues): OrderLineFieldErrors {
  const errors: OrderLineFieldErrors = {};

  if (!values.commoditySelected) {
    errors.commodity = "请选择商品或输入商品名称";
  }

  if (!values.categorySelected) {
    errors.category = "请选择分类或输入分类名称";
  }

  if (!values.unitSelected) {
    errors.unit = "请选择单位或输入单位名称";
  }

  const count = Number.parseFloat(values.lineCount);
  if (Number.isNaN(count) || count === 0) {
    errors.count = "数量不能为 0";
  }

  if (!values.linePrice.trim()) {
    errors.price = "请输入单价";
  } else {
    const price = Number.parseFloat(values.linePrice);
    if (Number.isNaN(price)) {
      errors.price = "单价无效";
    }
  }

  if (!values.lineTotal.trim()) {
    errors.lineTotal = "请输入总金额";
  } else {
    const lineTotal = Number.parseFloat(values.lineTotal);
    if (Number.isNaN(lineTotal)) {
      errors.lineTotal = "总金额无效";
    }
  }

  return errors;
}
