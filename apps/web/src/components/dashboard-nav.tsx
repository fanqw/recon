"use client";

import {
  IconCalendar,
  IconDashboard,
  IconList,
  IconLocation,
  IconMenuFold,
  IconMenuUnfold,
  IconStorage,
  IconTags,
} from "@arco-design/web-react/icon";
import { Button, Menu, Tooltip } from "@arco-design/web-react";
import {
  defaultOpenKeysForPath,
  findActiveWorkspaceNavItem,
  workspaceNavEntries,
  type WorkspaceNavEntry,
} from "@/lib/workspace-nav";
import { usePathname, useRouter } from "next/navigation";
import { useMemo, useState } from "react";

function iconForKey(key: string) {
  if (key === "/workspace") {
    return <IconDashboard />;
  }
  if (key === "/basic") {
    return <IconStorage />;
  }
  if (key === "/order") {
    return <IconCalendar />;
  }
  if (key === "/basic/category") {
    return <IconList />;
  }
  if (key === "/basic/commodity") {
    return <IconTags />;
  }
  if (key === "/basic/purchase-place") {
    return <IconLocation />;
  }

  return <IconStorage />;
}

function menuLabel(entry: Pick<WorkspaceNavEntry, "key" | "label">) {
  return (
    <span className="inline-flex min-w-0 items-center gap-2">
      <span className="inline-flex text-base">{iconForKey(entry.key)}</span>
      <span className="truncate">{entry.label}</span>
    </span>
  );
}

function isGroup(entry: WorkspaceNavEntry): entry is Extract<WorkspaceNavEntry, { children: unknown[] }> {
  return "children" in entry;
}

/**
 * 工作区侧栏：Arco `Menu` 分组与路由跳转（与 v1 分组一致）。
 */
export function DashboardNav() {
  const router = useRouter();
  const pathname = usePathname();
  const activeItem = useMemo(() => findActiveWorkspaceNavItem(pathname), [pathname]);
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      aria-label="主导航区域"
      className="dashboard-sidebar relative flex shrink-0 flex-col border-r transition-[width] duration-200"
      data-collapsed={String(collapsed)}
      data-testid="dashboard-sidebar"
    >
      <nav aria-label="主导航" className="flex-1 overflow-hidden pt-0 pb-14">
        <Menu
          collapse={collapsed}
          defaultOpenKeys={defaultOpenKeysForPath(pathname)}
          key={collapsed ? "collapsed" : pathname}
          mode="vertical"
          selectedKeys={[activeItem.key]}
          style={{ width: "100%" }}
          onClickMenuItem={(key) => router.push(key)}
        >
          {workspaceNavEntries.map((entry) =>
            isGroup(entry) ? (
              <Menu.SubMenu key={entry.key} selectable={false} title={menuLabel(entry)}>
                {entry.children.map((child) => (
                  <Menu.Item key={child.key}>{menuLabel(child)}</Menu.Item>
                ))}
              </Menu.SubMenu>
            ) : (
              <Menu.Item key={entry.key}>{menuLabel(entry)}</Menu.Item>
            ),
          )}
        </Menu>
      </nav>
      <div className="absolute right-3 bottom-3">
        <Tooltip content={collapsed ? "展开侧栏" : "收起侧栏"} position="right">
          <Button
            aria-label={collapsed ? "展开侧栏" : "收起侧栏"}
            icon={collapsed ? <IconMenuUnfold /> : <IconMenuFold />}
            shape="circle"
            size="small"
            onClick={() => setCollapsed((value) => !value)}
          />
        </Tooltip>
      </div>
    </aside>
  );
}
