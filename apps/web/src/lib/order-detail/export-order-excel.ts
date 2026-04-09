import ExcelJS from "exceljs";
import {
  computeCategoryAmountRowSpans,
  computeCategoryRowSpans,
  computeOrderTotalRowSpans,
} from "./line-aggregates";

/** 与页面表格一致的明细行（来自 API JSON）。 */
export type ExcelOrderLine = {
  total_price: number;
  origin_total_price: number;
  total_category_price: number;
  total_order_price: number;
  desc: string | null;
  count: number;
  price: number;
  commodity: { name: string };
  category: { name: string };
  unit: { name: string };
};

/**
 * 生成与页面明细表同结构的 xlsx，并触发浏览器下载。
 * 合并区、金额标红规则与 `OrderDetailTable` 一致。
 */
export async function downloadOrderDetailExcel(params: {
  /** 用于文件名与标题 */
  orderId: string;
  orderName: string;
  orderDesc: string | null;
  lines: ExcelOrderLine[];
}): Promise<void> {
  const { orderId, orderName, orderDesc, lines } = params;
  const categorySpans = computeCategoryRowSpans(lines);
  const categoryAmountSpans = computeCategoryAmountRowSpans(lines);
  const orderTotalSpans = computeOrderTotalRowSpans(lines.length);

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("订单明细", {
    views: [{ showGridLines: true }],
  });

  let r = 1;
  sheet.getCell(r, 1).value = `订单明细 — ${orderName}`;
  sheet.mergeCells(r, 1, r, 9);
  r += 1;
  if (orderDesc) {
    sheet.getCell(r, 1).value = `备注：${orderDesc}`;
    sheet.mergeCells(r, 1, r, 9);
    r += 1;
  }

  const headers = [
    "分类",
    "名称",
    "数量",
    "单位",
    "单价",
    "金额",
    "备注",
    "分类金额",
    "总金额",
  ];
  headers.forEach((h, c) => {
    const cell = sheet.getCell(r, c + 1);
    cell.value = h;
    cell.font = { bold: true };
  });
  r += 1;

  const dataStartRow = r;
  for (let i = 0; i < lines.length; i++) {
    const row = lines[i];
    const excelRow = sheet.getRow(r);

    if (categorySpans[i] > 0) {
      excelRow.getCell(1).value = row.category.name;
    }
    excelRow.getCell(2).value = row.commodity.name;
    excelRow.getCell(3).value = row.count;
    excelRow.getCell(4).value = row.unit.name;
    excelRow.getCell(5).value = row.price;

    const amountCell = excelRow.getCell(6);
    amountCell.value = row.total_price;
    if (row.total_price !== row.origin_total_price) {
      amountCell.font = { color: { argb: "FFFF0000" } };
    }

    excelRow.getCell(7).value = row.desc ?? "";

    if (categoryAmountSpans[i] > 0) {
      excelRow.getCell(8).value = row.total_category_price;
    }
    if (orderTotalSpans[i] > 0) {
      excelRow.getCell(9).value = row.total_order_price;
    }

    r += 1;
  }

  // 纵向合并：分类(1)、分类金额(8)、总金额(9)
  for (let i = 0; i < lines.length; i++) {
    const rowIndex = dataStartRow + i;
    const span = categorySpans[i];
    if (span > 1) {
      sheet.mergeCells(rowIndex, 1, rowIndex + span - 1, 1);
      sheet.mergeCells(rowIndex, 8, rowIndex + span - 1, 8);
    }
  }
  const ot = orderTotalSpans[0];
  if (ot > 1) {
    sheet.mergeCells(dataStartRow, 9, dataStartRow + ot - 1, 9);
  }

  sheet.columns = [
    { width: 12 },
    { width: 18 },
    { width: 8 },
    { width: 8 },
    { width: 10 },
    { width: 10 },
    { width: 14 },
    { width: 12 },
    { width: 12 },
  ];

  const buf = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buf], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `订单_${orderName}_${orderId.slice(0, 8)}.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
}
