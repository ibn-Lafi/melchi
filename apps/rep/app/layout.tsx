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
            بدل تمدد المحتوى بعرض غير مناسب.
            ملاحظة مهمة: بدون transform هنا عمدًا — لو أضيف transform لهذا
            العنصر، عناصر position:fixed بداخله (شريط التنقل) تفقد ثباتها
            بالشاشة أثناء التمرير وتتصرف كأنها position:absolute بدل ذلك
            (سلوك CSS معروف)، فيتحرك الشريط مع طول الصفحة بدل البقاء مثبّتًا
            بأسفل الشاشة المرئية. شريط التنقل بنفسه (fixed + inset-x + mx-auto
            + max-w) يتمركز تلقائيًا على نفس محور هذا الإطار لأن الاثنين
            يتمركزان أفقيًا داخل نفس الـ viewport. */}
        <div className="relative mx-auto min-h-screen w-full max-w-[430px] bg-background shadow-2xl">
          {children}
        </div>
      </body>
    </html>
  );
}
