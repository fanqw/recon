"use client";

import {
  Button,
  Space,
  Table,
  Typography,
  type TableColumnProps,
} from "@arco-design/web-react";
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
      <div className="rounded-lg border border-[#e5e6eb] bg-white p-6 text-center">
        <Typography.Text>暂无明细，请点击「新增明细」添加。</Typography.Text>
      </div>
    );
  }

  const columns: TableColumnProps<OrderDetailTableRow>[] = [
    {
      title: "分类",
      render: (_, row, index) => ({
        children: row.category.name,
        props: { rowSpan: categorySpans[index] },
      }),
    },
    { title: "名称", render: (_, row) => row.commodity.name },
    { title: "数量", dataIndex: "count" },
    { title: "单位", render: (_, row) => row.unit.name },
    { title: "单价", dataIndex: "price" },
    {
      title: "金额",
      render: (_, row) => (
        <Typography.Text type={row.line_total !== row.total_price ? "danger" : "default"}>
          {row.line_total}
        </Typography.Text>
      ),
    },
    { title: "备注", render: (_, row) => row.desc ?? "—" },
    {
      title: "分类金额",
      render: (_, row, index) => ({
        children: row.total_category_price,
        props: { rowSpan: categoryAmountSpans[index] },
      }),
    },
    {
      title: "总金额",
      render: (_, row, index) => ({
        children: <Typography.Text bold>{row.total_order_price}</Typography.Text>,
        props: { rowSpan: orderTotalSpans[index] },
      }),
    },
    {
      title: "操作",
      render: (_, row) => (
        <Space>
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
      style={{ borderRadius: 10, overflow: "hidden" }}
    />
  );
}
