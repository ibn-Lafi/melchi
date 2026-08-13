import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "المتجر",
  description: "تصفّح منتجاتنا واطلب مباشرة عبر واتساب",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl">
      <body>
        <header className="border-b border-border p-4">
          <nav className="mx-auto flex max-w-5xl items-center justify-between">
            <Link href="/" className="text-lg font-bold">
              المتجر
            </Link>
            <Link href="/points-of-sale" className="text-sm font-medium hover:underline">
              نقاط البيع 📍
            </Link>
          </nav>
        </header>
        {children}
      </body>
    </html>
  );
}
