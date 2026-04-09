import { getCurrentUser } from "@/lib/auth";
import { DashboardNav } from "@/components/dashboard-nav";
import { redirect } from "next/navigation";

/**
 * 已登录业务区布局：无会话则重定向登录页。
 */
export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  return (
    <div className="flex min-h-screen bg-zinc-50">
      <DashboardNav username={user.username} />
      <div className="flex flex-1 flex-col">
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
