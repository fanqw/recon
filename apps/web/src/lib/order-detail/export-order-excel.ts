import ExcelJS from "exceljs";
import {
  computeCategoryAmountRowSpans,
  computeCategoryRowSpans,
  computeOrderTotalRowSpans,
} from "./line-aggregates";

/** 与页面表格一致的明细行（来自 API JSON）。 */
export type ExcelOrderLine = {
  total_price: number;
  line_total: number;
  origin_total_price: number;
  total_category_price: number;
  total_order_price: number;
  desc: string | null;
  count: number;
  price: number;
  commodity: { name: string };
  category: { id: string; name: string };
  unit: { id: string; name: string };
};

function applyBorder(cell: ExcelJS.Cell) {
  cell.border = {
    top: { style: "thin", color: { argb: "FFD9DDE3" } },
    left: { style: "thin", color: { argb: "FFD9DDE3" } },
    bottom: { style: "thin", color: { argb: "FFD9DDE3" } },
    right: { style: "thin", color: { argb: "FFD9DDE3" } },
  };
}

function applyAmountNumberFormat(cell: ExcelJS.Cell) {
  cell.numFmt = "#,##0.00";
  cell.alignment = { horizontal: "center", vertical: "middle" };
}

export async function buildOrderDetailWorkbook(params: {
  orderName: string;
  orderDesc: string | null;
  lines: ExcelOrderLine[];
}): Promise<ExcelJS.Workbook> {
  const { orderName, orderDesc, lines } = params;
  const categorySpans = computeCategoryRowSpans(lines);
  const categoryAmountSpans = computeCategoryAmountRowSpans(lines);
  const orderTotalSpans = computeOrderTotalRowSpans(lines.length);

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Recon";
  workbook.created = new Date();
  const sheet = workbook.addWorksheet("订单明细", {
    views: [{ showGridLines: false }],
    properties: { defaultRowHeight: 24 },
  });
  sheet.pageSetup = {
    paperSize: 9,
    orientation: "portrait",
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 0,
    margins: {
      left: 0.35,
      right: 0.35,
      top: 0.4,
      bottom: 0.4,
      header: 0.2,
      footer: 0.2,
    },
  };

  sheet.columns = [
    { width: 14 },
    { width: 18 },
    { width: 10 },
    { width: 10 },
    { width: 12 },
    { width: 14 },
    { width: 22 },
    { width: 14 },
    { width: 14 },
  ];

  let r = 1;
  sheet.getRow(r).height = 28;
  sheet.getCell(r, 1).value = "订单明细";
  sheet.getCell(r, 1).font = { bold: true, size: 16, color: { argb: "FF1D2129" } };
  sheet.mergeCells(r, 1, r, 9);
  r += 1;

  sheet.getRow(r).height = 22;
  sheet.getCell(r, 1).value = `订单名称：${orderName}`;
  sheet.getCell(r, 1).font = { bold: true, color: { argb: "FF1D2129" } };
  sheet.mergeCells(r, 1, r, 5);
  sheet.getCell(r, 6).value = "导出时间：";
  sheet.getCell(r, 6).font = { color: { argb: "FF4E5969" } };
  sheet.getCell(r, 6).alignment = { horizontal: "left", vertical: "middle" };
  sheet.getCell(r, 7).value = workbook.created;
  sheet.getCell(r, 7).numFmt = "yyyy-mm-dd hh:mm";
  sheet.getCell(r, 7).alignment = { horizontal: "left", vertical: "middle" };
  sheet.mergeCells(r, 7, r, 9);
  r += 1;

  sheet.getRow(r).height = 20;
  sheet.getCell(r, 1).value = `订单备注：${orderDesc || "—"}`;
  sheet.getCell(r, 1).font = { color: { argb: "FF4E5969" } };
  sheet.mergeCells(r, 1, r, 9);
  r += 2;

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
    cell.font = { bold: true, color: { argb: "FF1D2129" } };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFF2F3F5" },
    };
    cell.alignment = { horizontal: "center", vertical: "middle" };
    applyBorder(cell);
  });
  sheet.getRow(r).height = 22;
  r += 1;

  const dataStartRow = r;
  for (let i = 0; i < lines.length; i++) {
    const row = lines[i];
    const excelRow = sheet.getRow(r);
    excelRow.height = 22;

    if (categorySpans[i] > 0) {
      excelRow.getCell(1).value = row.category.name;
    }
    excelRow.getCell(2).value = row.commodity.name;
    excelRow.getCell(3).value = row.count;
    excelRow.getCell(3).alignment = { horizontal: "center", vertical: "middle" };
    excelRow.getCell(4).value = row.unit.name;
    excelRow.getCell(4).alignment = { horizontal: "center", vertical: "middle" };

    const priceCell = excelRow.getCell(5);
    priceCell.value = row.price;
    applyAmountNumberFormat(priceCell);

    const amountCell = excelRow.getCell(6);
    amountCell.value = row.line_total;
    applyAmountNumberFormat(amountCell);
    if (row.line_total !== row.total_price) {
      amountCell.font = { color: { argb: "FFF53F3F" } };
    }

    excelRow.getCell(7).value = row.desc ?? "—";

    if (categoryAmountSpans[i] > 0) {
      const categoryAmountCell = excelRow.getCell(8);
      categoryAmountCell.value = row.total_category_price;
      applyAmountNumberFormat(categoryAmountCell);
    }
    if (orderTotalSpans[i] > 0) {
      const orderAmountCell = excelRow.getCell(9);
      orderAmountCell.value = row.total_order_price;
      applyAmountNumberFormat(orderAmountCell);
      orderAmountCell.font = { bold: true, color: { argb: "FF1D2129" } };
    }

    excelRow.eachCell({ includeEmpty: true }, (cell) => {
      if (![3, 4, 5, 6, 8, 9].includes(Number(cell.col))) {
        cell.alignment = { horizontal: "left", vertical: "middle" };
      }
      applyBorder(cell);
    });
    r += 1;
  }

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

  return workbook;
}

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
  const workbook = await buildOrderDetailWorkbook({ orderName, orderDesc, lines });
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
