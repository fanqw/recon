"use client";

import { Breadcrumb } from "@arco-design/web-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const nameMap: Record<string, string> = {
  basic: "基础资料",
  category: "分类",
  unit: "单位",
  commodity: "商品",
  "purchase-place": "进货地",
  order: "订单",
  list: "列表",
};

function labelFor(seg: string) {
  return nameMap[seg] ?? seg;
}

export function DashboardBreadcrumb() {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);

  const items = segments.map((seg, idx) => ({
    href: `/${segments.slice(0, idx + 1).join("/")}`,
    label: labelFor(seg),
  }));

  return (
    <div className="rounded-lg border border-[#e5e6eb] bg-white px-3 py-2">
      <Breadcrumb>
        <Breadcrumb.Item>
          <Link href="/basic/category">工作台</Link>
        </Breadcrumb.Item>
        {items.map((item, idx) => (
          <Breadcrumb.Item key={item.href}>
            {idx === items.length - 1 ? item.label : <Link href={item.href}>{item.label}</Link>}
          </Breadcrumb.Item>
        ))}
      </Breadcrumb>
    </div>
  );
}
