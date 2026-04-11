import { getCurrentUser } from "@/lib/auth";
import { DashboardHeader } from "@/components/dashboard-header";
import { DashboardBreadcrumb } from "@/components/dashboard-breadcrumb";
import { DashboardNav } from "@/components/dashboard-nav";
import { redirect } from "next/navigation";

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
    <div className="dashboard-shell min-h-screen">
      <DashboardHeader username={user.username} />
      <div className="flex min-h-[calc(100vh-56px)]">
        <DashboardNav />
        <main className="flex-1 px-4 py-3 sm:px-5 lg:px-6">
          <div className="mx-auto flex w-full max-w-[1320px] flex-col gap-3">
            <DashboardBreadcrumb />
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
