"use client";

import {
  computeCategoryAmountRowSpans,
  computeCategoryRowSpans,
  computeOrderTotalRowSpans,
} from "@/lib/order-detail/line-aggregates";
import type { ExcelOrderLine } from "@/lib/order-detail/export-order-excel";

/** 表格行 = 导出用行结构 + 明细 id 与商品 id（编辑表单回填）。 */
export type OrderDetailTableRow = ExcelOrderLine & { id: string; commodityId: string };

type Props = {
  lines: OrderDetailTableRow[];
  /** 点击编辑，父组件打开表单并填入该行 */
  onEdit: (row: OrderDetailTableRow) => void;
  /** 删除指定明细 */
  onDelete: (lineId: string) => void;
};

/**
 * 订单明细表：列顺序与合并规则对齐 v1；`line_total` 与舍入基准 `total_price` 不等时金额列标红。
 */
export function OrderDetailTable({ lines, onEdit, onDelete }: Props) {
  const categorySpans = computeCategoryRowSpans(lines);
  const categoryAmountSpans = computeCategoryAmountRowSpans(lines);
  const orderTotalSpans = computeOrderTotalRowSpans(lines.length);

  if (lines.length === 0) {
    return (
      <p className="rounded border border-dashed border-zinc-200 bg-white p-8 text-center text-zinc-500">
        暂无明细，请点击「新增明细」添加。
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-zinc-200 bg-white">
      <table className="w-full border-collapse text-left text-sm">
        <thead className="border-b border-zinc-200 bg-zinc-50">
          <tr>
            <th className="px-2 py-2 font-medium text-zinc-700">分类</th>
            <th className="px-2 py-2 font-medium text-zinc-700">名称</th>
            <th className="px-2 py-2 font-medium text-zinc-700">数量</th>
            <th className="px-2 py-2 font-medium text-zinc-700">单位</th>
            <th className="px-2 py-2 font-medium text-zinc-700">单价</th>
            <th className="px-2 py-2 font-medium text-zinc-700">金额</th>
            <th className="px-2 py-2 font-medium text-zinc-700">备注</th>
            <th className="px-2 py-2 font-medium text-zinc-700">分类金额</th>
            <th className="px-2 py-2 font-medium text-zinc-700">总金额</th>
            <th className="px-2 py-2 font-medium text-zinc-700">操作</th>
          </tr>
        </thead>
        <tbody>
          {lines.map((row, i) => (
            <tr key={row.id} className="border-b border-zinc-100">
              {categorySpans[i] > 0 ? (
                <td
                  className="align-top px-2 py-2 text-zinc-900"
                  rowSpan={categorySpans[i]}
                >
                  {row.category.name}
                </td>
              ) : null}
              <td className="px-2 py-2 text-zinc-900">{row.commodity.name}</td>
              <td className="px-2 py-2 text-zinc-800">{row.count}</td>
              <td className="px-2 py-2 text-zinc-800">{row.unit.name}</td>
              <td className="px-2 py-2 text-zinc-800">{row.price}</td>
              <td
                className={
                  row.line_total !== row.total_price
                    ? "px-2 py-2 font-medium text-red-600"
                    : "px-2 py-2 text-zinc-900"
                }
              >
                {row.line_total}
              </td>
              <td className="px-2 py-2 text-zinc-600">{row.desc ?? "—"}</td>
              {categoryAmountSpans[i] > 0 ? (
                <td
                  className="align-top px-2 py-2 text-zinc-900"
                  rowSpan={categoryAmountSpans[i]}
                >
                  {row.total_category_price}
                </td>
              ) : null}
              {orderTotalSpans[i] > 0 ? (
                <td
                  className="align-top px-2 py-2 text-lg font-bold text-zinc-900"
                  rowSpan={orderTotalSpans[i]}
                >
                  {row.total_order_price}
                </td>
              ) : null}
              <td className="px-2 py-2">
                <button
                  type="button"
                  className="mr-2 text-blue-600 hover:underline"
                  onClick={() => onEdit(row)}
                >
                  编辑
                </button>
                <button
                  type="button"
                  className="text-red-600 hover:underline"
                  onClick={() => onDelete(row.id)}
                >
                  删除
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
