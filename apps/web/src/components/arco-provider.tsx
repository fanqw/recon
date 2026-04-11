"use client";

import { ConfigProvider } from "@arco-design/web-react";

export function ArcoProvider({ children }: { children: React.ReactNode }) {
  return <ConfigProvider>{children}</ConfigProvider>;
}
