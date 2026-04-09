import type { Metadata } from "next";
import "./globals.css";

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
      <body className="min-h-full flex flex-col font-sans">{children}</body>
    </html>
  );
}
