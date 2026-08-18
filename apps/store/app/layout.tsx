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
  title: "ميلتشي",
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
        <header className="sticky top-0 z-10 border-b border-border bg-background/85 backdrop-blur">
          <nav className="mx-auto flex max-w-5xl items-center justify-between px-5 py-3.5 lg:max-w-6xl lg:px-8 lg:py-5 xl:max-w-7xl">
            <Link href="/" className="flex items-center gap-2.5">
              <span className="flex h-[34px] w-[34px] items-center justify-center rounded-[9px] bg-primary text-[15px] font-black text-primary-foreground lg:h-10 lg:w-10 lg:rounded-[11px] lg:text-base">
                م
              </span>
              <span className="text-[17px] font-black tracking-tight lg:text-[19px]">ميلتشي</span>
            </Link>
            <Link
              href="/points-of-sale"
              className="flex h-[38px] items-center gap-2 rounded-full border-[1.5px] border-foreground px-3.5 text-[13px] font-bold transition-opacity hover:opacity-70 lg:h-11 lg:px-[18px] lg:text-sm"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M12 22s7-6.2 7-12.4A7 7 0 0 0 5 9.6C5 15.8 12 22 12 22Z" />
                <circle cx="12" cy="9.6" r="2.4" />
              </svg>
              <span className="hidden sm:inline">نقاط البيع</span>
            </Link>
          </nav>
        </header>
        {children}
      </body>
    </html>
  );
}
