import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@system2026/database/server";
import { AdminSidebar } from "../../components/admin-sidebar";

// ملاحظة: icon هنا اسم (string) وليس دالة React — مكوّنات الأيقونات لا يمكن
// تمريرها كـ props من Server Component (هذا الملف) لـ Client Component
// (AdminSidebar/AdminNav)، فالربط الفعلي بين الاسم والمكوّن يتم داخل
// admin-nav.tsx (ICON_MAP) على جانب العميل.
const NAV_ITEMS = [
  { href: "/", label: "الرئيسية", icon: "home" as const },
  { href: "/products", label: "المنتجات", icon: "box" as const },
  { href: "/suppliers", label: "الموردين", icon: "truck" as const },
  { href: "/warehouse", label: "المخزون", icon: "warehouse" as const },
  { href: "/reps", label: "المناديب", icon: "users" as const },
  { href: "/customers", label: "العملاء", icon: "store" as const },
  { href: "/invoices", label: "الفواتير", icon: "invoice" as const },
  { href: "/reports", label: "التقارير", icon: "chart" as const },
];

const SETTINGS_ITEMS = [
  { href: "/settings", label: "الإعدادات", icon: "settings" as const, adminOnly: true },
];

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select<"name, role", { name: string; role: "admin" | "accountant" | "rep" }>("name, role")
    .eq("id", user.id)
    .single();

  const visibleSettingsItems = SETTINGS_ITEMS.filter(
    (item) => !item.adminOnly || profile?.role === "admin",
  );

  return (
    <div className="flex min-h-screen bg-muted/40">
      <AdminSidebar
        navItems={NAV_ITEMS}
        settingsItems={visibleSettingsItems}
        profileName={profile?.name}
        profileRole={profile?.role === "admin" ? "admin" : "accountant"}
      />
      <main className="flex-1 p-6 sm:p-8">
        <div className="mx-auto max-w-6xl">{children}</div>
      </main>
    </div>
  );
}
