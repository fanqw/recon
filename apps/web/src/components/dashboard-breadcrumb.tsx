"use client";

import { Breadcrumb } from "@arco-design/web-react";
import { getWorkspaceBreadcrumbs } from "@/lib/workspace-nav";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function DashboardBreadcrumb() {
  const pathname = usePathname();
  const items = getWorkspaceBreadcrumbs(pathname);

  return (
    <nav aria-label="页面位置" className="dashboard-breadcrumb rounded-lg border px-3 py-2">
      <Breadcrumb>
        {items.map((item, idx) => {
          const isLast = idx === items.length - 1;
          return (
            <Breadcrumb.Item key={`${item.label}-${idx}`}>
              {item.href && !isLast ? <Link href={item.href}>{item.label}</Link> : item.label}
            </Breadcrumb.Item>
          );
        })}
      </Breadcrumb>
    </nav>
  );
}
