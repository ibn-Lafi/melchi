import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "تطبيق المندوب",
  description: "خط السير، الفواتير الميدانية، والتحصيلات",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl">
      <body className="bg-muted">
        {/* إطار بعرض جوال ثابت (max-w-[430px]) — يملأ الشاشة كاملة فعليًا على
            جوال حقيقي، ويظهر كعمود متوسّط بعرض جوال على شاشة أوسع (كمبيوتر)،
            بدل تمدد المحتوى بعرض غير مناسب. transform يفتح containing block
            جديد لعناصر position:fixed (شريط التنقل) لتبقى مثبّتة بأسفل هذا
            الإطار نفسه دائمًا، بغض النظر عن عرض نافذة المتصفح الفعلي. */}
        <div className="relative mx-auto min-h-screen w-full max-w-[430px] transform bg-background shadow-2xl">
          {children}
        </div>
      </body>
    </html>
  );
}
