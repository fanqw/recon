"use client";

import { Button, Space, Typography } from "@arco-design/web-react";
import { useRouter } from "next/navigation";

type Props = {
  username: string;
};

export function DashboardHeader({ username }: Props) {
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/auth/logout", {
      method: "POST",
      credentials: "include",
    });
    router.replace("/login");
    router.refresh();
  }

  return (
    <header className="h-14 border-b border-[#e5e6eb] bg-white px-4 sm:px-5 lg:px-6">
      <div className="flex h-full items-center justify-between">
        <Typography.Text style={{ fontWeight: 600 }}>Recon 对账系统</Typography.Text>
        <Space size={12}>
          <Typography.Text>{username}</Typography.Text>
          <Button size="small" status="danger" onClick={handleLogout}>
            退出登录
          </Button>
        </Space>
      </div>
    </header>
  );
}
