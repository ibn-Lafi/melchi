import type { Metadata, Viewport } from "next";
import Link from "next/link";
import "./globals.css";

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
    <html lang="ar" dir="rtl">
      <body>
        <header className="sticky top-0 z-10 border-b border-border bg-background/80 backdrop-blur">
          <nav className="mx-auto flex max-w-5xl items-center justify-between p-4">
            <Link href="/" className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary text-sm font-bold text-primary-foreground">
                و
              </span>
              <span className="text-lg font-bold">المتجر</span>
            </Link>
            <Link
              href="/points-of-sale"
              className="rounded-full border border-border px-4 py-2 text-sm font-medium transition-colors hover:bg-muted"
            >
              نقاط البيع 📍
            </Link>
          </nav>
        </header>
        {children}
      </body>
    </html>
  );
}
