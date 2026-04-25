import { describe, expect, it } from "vitest";
import { buildOrderDetailWorkbook } from "./export-order-excel";

describe("buildOrderDetailWorkbook", () => {
  it("renders a styled workbook with title, summary, headers, and amount formats", async () => {
    const workbook = await buildOrderDetailWorkbook({
      orderName: "白沙洲门店补货单",
      orderDesc: "凌晨到货，需复核蓝莓单价",
      lines: [
        {
          commodity: { name: "盒装蓝莓" },
          category: { id: "cat-1", name: "时令水果" },
          unit: { id: "unit-1", name: "箱" },
          count: 3,
          price: 24.5,
          total_price: 73.5,
          line_total: 75,
          origin_total_price: 73.5,
          total_category_price: 75,
          total_order_price: 75,
          desc: "临时补差",
        },
      ],
    });

    const sheet = workbook.getWorksheet("订单明细");
    expect(sheet).toBeDefined();
    if (!sheet) throw new Error("worksheet not found");
    expect(sheet.getCell("A1").value).toBe("订单明细");
    expect(sheet.getCell("A2").value).toBe("订单名称：白沙洲门店补货单");
    expect(sheet.getCell("F2").value).toBe("导出时间：");
    expect(sheet.getCell("F2").alignment).toMatchObject({ horizontal: "left" });
    expect(sheet.getCell("A3").value).toBe("订单备注：凌晨到货，需复核蓝莓单价");
    expect(sheet.pageSetup.paperSize).toBe(9);
    expect(sheet.getCell("A5").value).toBe("分类");
    expect(sheet.getCell("A5").fill).toMatchObject({
      fgColor: { argb: "FFF2F3F5" },
    });
    expect(sheet.getCell("C6").alignment).toMatchObject({ horizontal: "center" });
    expect(sheet.getCell("D6").alignment).toMatchObject({ horizontal: "center" });
    expect(sheet.getCell("E6").numFmt).toBe("#,##0.00");
    expect(sheet.getCell("E6").alignment).toMatchObject({ horizontal: "center" });
    expect(sheet.getCell("F6").numFmt).toBe("#,##0.00");
    expect(sheet.getCell("F6").alignment).toMatchObject({ horizontal: "center" });
    expect(sheet.getCell("H6").alignment).toMatchObject({ horizontal: "center" });
    expect(sheet.getCell("I6").alignment).toMatchObject({ horizontal: "center" });
    expect(sheet.getCell("F6").font).toMatchObject({
      color: { argb: "FFF53F3F" },
    });
    expect(sheet.getCell("I6").font).toMatchObject({
      bold: true,
    });
  });
});
