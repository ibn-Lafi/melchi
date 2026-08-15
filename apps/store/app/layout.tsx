import type { Metadata, Viewport } from "next";
import Link from "next/link";
import localFont from "next/font/local";
import "./globals.css";

// خط Cairo محلي (لا يحتاج اتصال شبكة وقت البناء) — راجع تعليق apps/admin/app/layout.tsx
const cairo = localFont({
  src: "./fonts/cairo-variable.ttf",
  weight: "200 1000",
  variable: "--font-cairo",
});

export const metadata: Metadata = {
  title: "المتجر",
  description: "تصفّح منتجاتنا واطلب مباشرة عبر واتساب",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl" className={cairo.variable}>
      <body>
        <header className="sticky top-0 z-10 border-b border-border bg-background/80 backdrop-blur">
          <nav className="mx-auto flex max-w-5xl items-center justify-between p-4 lg:max-w-6xl lg:px-6 xl:max-w-7xl">
            <Link href="/" className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary text-sm font-bold text-primary-foreground">
                و
              </span>
              <span className="text-lg font-bold">المتجر</span>
            </Link>
          </nav>
        </header>
        {children}
      </body>
    </html>
  );
}
