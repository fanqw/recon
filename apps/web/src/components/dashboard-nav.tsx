"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

type Props = {
  /** 当前登录用户名，用于页眉展示 */
  username: string;
};

/**
 * 侧栏导航与登出；登出后清除会话并跳转登录页。
 */
export function DashboardNav({ username }: Props) {
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/auth/logout", {
      method: "POST",
      credentials: "include",
    });
    router.replace("/login");
    router.refresh();
  }

  const linkCls =
    "block rounded px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-100";

  return (
    <aside className="flex w-52 flex-col border-r border-zinc-200 bg-white">
      <div className="border-b border-zinc-100 p-4">
        <p className="text-xs text-zinc-500">已登录</p>
        <p className="font-medium text-zinc-900">{username}</p>
      </div>
      <nav className="flex flex-1 flex-col gap-1 p-2">
        <Link href="/basic/category" className={linkCls}>
          分类
        </Link>
        <Link href="/basic/unit" className={linkCls}>
          单位
        </Link>
        <Link href="/basic/commodity" className={linkCls}>
          商品
        </Link>
        <Link href="/basic/purchase-place" className={linkCls}>
          进货地
        </Link>
        <Link href="/order/list" className={linkCls}>
          订单
        </Link>
      </nav>
      <div className="border-t border-zinc-100 p-2">
        <button
          type="button"
          onClick={handleLogout}
          className="w-full rounded px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50"
        >
          退出登录
        </button>
      </div>
    </aside>
  );
}
