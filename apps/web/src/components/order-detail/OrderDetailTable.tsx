"use client";

import {
  Button,
  Space,
  Table,
  Typography,
  type TableColumnProps,
} from "@arco-design/web-react";
import { ListTableEmptyState } from "@/components/list-table-empty";
import {
  computeCategoryAmountRowSpans,
  computeCategoryRowSpans,
  computeOrderTotalRowSpans,
} from "@/lib/order-detail/line-aggregates";
import type { ExcelOrderLine } from "@/lib/order-detail/export-order-excel";

export type OrderDetailTableRow = ExcelOrderLine & { id: string; commodityId: string };

type Props = {
  lines: OrderDetailTableRow[];
  onEdit: (row: OrderDetailTableRow) => void;
  onDelete: (lineId: string) => void;
};

export function OrderDetailTable({ lines, onEdit, onDelete }: Props) {
  const categorySpans = computeCategoryRowSpans(lines);
  const categoryAmountSpans = computeCategoryAmountRowSpans(lines);
  const orderTotalSpans = computeOrderTotalRowSpans(lines.length);

  if (lines.length === 0) {
    return (
      <div className="rounded-lg border border-[#e5e6eb] bg-[var(--surface)]">
        <ListTableEmptyState message="暂无商品，请点击「新增商品」添加。" />
      </div>
    );
  }

  const columns: TableColumnProps<OrderDetailTableRow>[] = [
    {
      title: "分类",
      fixed: "left",
      width: 132,
      render: (_, row, index) => ({
        children: row.category.name,
        props: { rowSpan: categorySpans[index] },
      }),
    },
    { title: "名称", width: 128, render: (_, row) => row.commodity.name },
    { title: "数量", width: 96, dataIndex: "count" },
    { title: "单位", width: 96, render: (_, row) => row.unit.name },
    { title: "单价", width: 108, dataIndex: "price" },
    {
      title: "金额",
      width: 108,
      render: (_, row) =>
        row.line_total !== row.total_price ? (
          <Typography.Text type="error">{row.line_total}</Typography.Text>
        ) : (
          <Typography.Text>{row.line_total}</Typography.Text>
        ),
    },
    { title: "备注", width: 168, render: (_, row) => row.desc ?? "—" },
    {
      title: "分类金额",
      width: 112,
      render: (_, row, index) => ({
        children: row.total_category_price,
        props: { rowSpan: categoryAmountSpans[index] },
      }),
    },
    {
      title: "总金额",
      width: 112,
      render: (_, row, index) => ({
        children: <Typography.Text bold>{row.total_order_price}</Typography.Text>,
        props: { rowSpan: orderTotalSpans[index] },
      }),
    },
    {
      title: "操作",
      fixed: "right",
      width: 112,
      cellStyle: { paddingLeft: 12, paddingRight: 12 },
      headerCellStyle: { paddingLeft: 12, paddingRight: 12 },
      render: (_, row) => (
        <Space size={12}>
          <Button type="text" onClick={() => onEdit(row)}>编辑</Button>
          <Button type="text" status="danger" onClick={() => onDelete(row.id)}>删除</Button>
        </Space>
      ),
    },
  ];

  return (
    <Table
      rowKey="id"
      columns={columns}
      data={lines}
      pagination={false}
      borderCell
      scroll={{ x: 1172 }}
      style={{ borderRadius: 10, overflow: "hidden" }}
    />
  );
}
