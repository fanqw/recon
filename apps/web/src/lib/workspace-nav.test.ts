import { describe, expect, it } from "vitest";
import { getWorkspaceBreadcrumbs } from "./workspace-nav";

describe("getWorkspaceBreadcrumbs", () => {
  it("returns category page breadcrumbs with menu group hierarchy", () => {
    expect(getWorkspaceBreadcrumbs("/basic/category")).toEqual([
      { label: "物料管理" },
      { label: "商品分类", href: "/basic/category" },
    ]);
  });

  it("returns order detail breadcrumbs with menu hierarchy only", () => {
    expect(getWorkspaceBreadcrumbs("/order/list/123")).toEqual([
      { label: "订单管理" },
      { label: "订单详情" },
    ]);
  });
});
