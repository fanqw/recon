export { buildOrderDetailTableTitle } from "./title";
export { buildOrderDetailWorkbook, downloadOrderDetailExcel } from "./export-order-excel";
export type { ExcelOrderLine } from "./export-order-excel";
export {
  computeCategoryRowSpans,
  computeCategoryAmountRowSpans,
  computeOrderTotalRowSpans,
} from "./line-aggregates";
export type { RowWithCategoryName } from "./line-aggregates";
