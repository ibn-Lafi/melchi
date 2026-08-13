import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "تطبيق المندوب",
  description: "خط السير، الفواتير الميدانية، والتحصيلات",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl">
      <body>{children}</body>
    </html>
  );
}
