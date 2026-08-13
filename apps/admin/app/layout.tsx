import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "لوحة التحكم",
  description: "لوحة تحكم نظام التوزيع والمبيعات الميدانية",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl">
      <body>{children}</body>
    </html>
  );
}
