export type WorkspaceNavItem = {
  key: string;
  label: string;
  href: string;
};

export type WorkspaceNavGroup = {
  key: string;
  label: string;
  children: WorkspaceNavItem[];
};

export type WorkspaceNavEntry = WorkspaceNavItem | WorkspaceNavGroup;

export type WorkspaceBreadcrumbItem = {
  label: string;
  href?: string;
};

export const workspaceNavEntries: WorkspaceNavEntry[] = [
  {
    key: "/workspace",
    label: "工作台",
    href: "/workspace",
  },
  {
    key: "/basic",
    label: "物料管理",
    children: [
      { key: "/basic/category", label: "商品分类", href: "/basic/category" },
      { key: "/basic/unit", label: "商品单位", href: "/basic/unit" },
      { key: "/basic/commodity", label: "商品信息", href: "/basic/commodity" },
      { key: "/basic/purchase-place", label: "进货地", href: "/basic/purchase-place" },
    ],
  },
  {
    key: "/order",
    label: "订单管理",
    children: [{ key: "/order/list", label: "订单列表", href: "/order/list" }],
  },
];

export const workspaceHome: WorkspaceNavItem = workspaceNavEntries[0] as WorkspaceNavItem;
const orderDetailPrefix = "/order/list/";

function isGroup(entry: WorkspaceNavEntry): entry is WorkspaceNavGroup {
  return "children" in entry;
}

export function flattenWorkspaceNavItems(): WorkspaceNavItem[] {
  return workspaceNavEntries.flatMap((entry) => (isGroup(entry) ? entry.children : [entry]));
}

export function isPathInNavItem(pathname: string, item: WorkspaceNavItem): boolean {
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

export function findActiveWorkspaceNavItem(pathname: string): WorkspaceNavItem {
  return (
    flattenWorkspaceNavItems().find((item) => isPathInNavItem(pathname, item)) ?? workspaceHome
  );
}

export function defaultOpenKeysForPath(pathname: string): string[] {
  return workspaceNavEntries
    .filter((entry) => isGroup(entry) && entry.children.some((item) => isPathInNavItem(pathname, item)))
    .map((entry) => entry.key);
}

export function getWorkspaceBreadcrumbs(pathname: string): WorkspaceBreadcrumbItem[] {
  if (pathname === workspaceHome.href || pathname.startsWith(`${workspaceHome.href}/`)) {
    return [{ label: workspaceHome.label }];
  }

  if (pathname.startsWith(orderDetailPrefix)) {
    return [
      { label: "订单管理" },
      { label: "订单详情" },
    ];
  }

  for (const entry of workspaceNavEntries) {
    if (!isGroup(entry)) {
      continue;
    }

    const activeChild = entry.children.find((item) => isPathInNavItem(pathname, item));
    if (!activeChild) {
      continue;
    }

    const breadcrumbs: WorkspaceBreadcrumbItem[] = [
      { label: entry.label },
      { label: activeChild.label, href: activeChild.href },
    ];

    return breadcrumbs;
  }

  return [{ label: workspaceHome.label }];
}

export function normalizeWorkspaceBreadcrumbs(
  items: WorkspaceBreadcrumbItem[],
): WorkspaceBreadcrumbItem[] {
  const normalized = [...items];
  while (
    normalized.length >= 2 &&
    normalized[0].label === workspaceHome.label &&
    normalized[1].label === workspaceHome.label
  ) {
    normalized.shift();
  }

  return normalized;
}
