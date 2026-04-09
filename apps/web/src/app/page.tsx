import { redirect } from "next/navigation";

/**
 * 根路径进入业务首页；未登录时由中间件或 dashboard layout 处理跳转登录。
 */
export default function Home() {
  redirect("/basic/category");
}
