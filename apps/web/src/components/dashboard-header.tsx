"use client";

import { Button, Space, Typography } from "@arco-design/web-react";
import { IconMoon, IconSun } from "@arco-design/web-react/icon";
import { useDashboardTheme } from "@/components/arco-provider";
import { useRouter } from "next/navigation";

type Props = {
  username: string;
};

export function DashboardHeader({ username }: Props) {
  const router = useRouter();
  const { theme, toggleTheme } = useDashboardTheme();
  const isDark = theme === "dark";

  async function handleLogout() {
    await fetch("/api/auth/logout", {
      method: "POST",
      credentials: "include",
    });
    router.replace("/login");
    router.refresh();
  }

  return (
    <header className="dashboard-header h-14 border-b px-4 sm:px-5 lg:px-6">
      <div className="flex h-full items-center justify-between">
        <Typography.Text style={{ fontWeight: 600 }}>Recon 对账系统</Typography.Text>
        <Space size={12}>
          <Button
            aria-label={isDark ? "切换为浅色主题" : "切换为深色主题"}
            icon={isDark ? <IconSun /> : <IconMoon />}
            shape="circle"
            size="small"
            onClick={toggleTheme}
          />
          <Typography.Text>{username}</Typography.Text>
          <Button size="small" status="danger" onClick={handleLogout}>
            退出登录
          </Button>
        </Space>
      </div>
    </header>
  );
}
