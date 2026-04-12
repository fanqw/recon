import type { Metadata } from "next";
import "@arco-design/web-react/dist/css/arco.css";
import "./globals.css";
import { ArcoProvider } from "@/components/arco-provider";

export const metadata: Metadata = {
  title: "recon",
  description: "对账/账务系统",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" className="h-full antialiased">
      <body className="min-h-full font-sans">
        <ArcoProvider>{children}</ArcoProvider>
      </body>
    </html>
  );
}
