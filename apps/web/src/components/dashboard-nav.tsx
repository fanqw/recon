"use client";

import {
  IconCalendar,
  IconList,
  IconLocation,
  IconStorage,
  IconTags,
} from "@arco-design/web-react/icon";
import { Menu } from "@arco-design/web-react";
import { usePathname, useRouter } from "next/navigation";

const navItems = [
  { key: "/basic/category", label: "分类", icon: <IconList /> },
  { key: "/basic/unit", label: "单位", icon: <IconStorage /> },
  { key: "/basic/commodity", label: "商品", icon: <IconTags /> },
  { key: "/basic/purchase-place", label: "进货地", icon: <IconLocation /> },
  { key: "/order/list", label: "订单", icon: <IconCalendar /> },
];

function activeKey(pathname: string): string {
  const hit = navItems.find((item) => pathname === item.key || pathname.startsWith(`${item.key}/`));
  return hit?.key ?? "/basic/category";
}

export function DashboardNav() {
  const router = useRouter();
  const pathname = usePathname();

  return (
    <aside className="w-56 border-r border-[#e5e6eb] bg-white">
      <Menu
        style={{ width: "100%", paddingTop: 8 }}
        selectedKeys={[activeKey(pathname)]}
        onClickMenuItem={(key) => router.push(key)}
      >
        {navItems.map((item) => (
          <Menu.Item key={item.key}>
            <span className="mr-2 inline-flex items-center">{item.icon}</span>
            {item.label}
          </Menu.Item>
        ))}
      </Menu>
    </aside>
  );
}
