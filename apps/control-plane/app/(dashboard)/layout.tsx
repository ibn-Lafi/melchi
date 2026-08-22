import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@system2026/database/server";
import { logoutAction } from "../(auth)/login/actions";

// لا يوجد جدول profiles/أدوار هنا (مشغّل واحد بهذه المرحلة) — التحقق يقتصر
// على وجود جلسة صالحة، مطابقًا لسلوك middleware.ts.
export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  return (
    <div className="min-h-screen">
      <header className="flex items-center justify-between border-b border-border px-6 py-4">
        <span className="font-bold">لوحة التحكم المركزية</span>
        <form action={logoutAction}>
          <button type="submit" className="text-sm text-muted-foreground hover:text-foreground">
            تسجيل الخروج
          </button>
        </form>
      </header>
      {children}
    </div>
  );
}
