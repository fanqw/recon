/**
 * 订单明细表格「合并单元格」与 v1 Ant Design Table `onCell` rowSpan 规则一致：
 * - 分类名变化时，该分类首行 rowSpan = 该分类连续行数，其余行为 0；
 * - 分类金额列与分类列使用相同 rowSpan；
 * - 总金额列仅第 0 行 rowSpan = 总行数，其余为 0。
 */

/** 需带 `category.name` 用于分组。 */
export type RowWithCategoryName = {
  category: { name: string };
};

/**
 * 计算「分类」列各行 rowSpan；与 v1 `order-detail` 中分类列 onCell 一致。
 */
export function computeCategoryRowSpans(
  items: RowWithCategoryName[]
): number[] {
  const spans = new Array(items.length).fill(0);
  let i = 0;
  while (i < items.length) {
    const name = items[i].category.name;
    let j = i;
    while (j < items.length && items[j].category.name === name) {
      j++;
    }
    spans[i] = j - i;
    i = j;
  }
  return spans;
}

/**
 * 「分类金额」列与分类列合并规则相同（v1 两处 onCell 逻辑一致）。
 */
export function computeCategoryAmountRowSpans(
  items: RowWithCategoryName[]
): number[] {
  return computeCategoryRowSpans(items);
}

/**
 * 「总金额」列：仅首行 rowSpan = 列表长度，其余为 0。
 */
export function computeOrderTotalRowSpans(itemCount: number): number[] {
  if (itemCount === 0) return [];
  const spans = new Array(itemCount).fill(0);
  spans[0] = itemCount;
  return spans;
}
