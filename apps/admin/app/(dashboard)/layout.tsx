import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@system2026/database/server";
import { AdminNav } from "../../components/admin-nav";

const NAV_ITEMS = [
  { href: "/", label: "الرئيسية" },
  { href: "/products", label: "المنتجات" },
  { href: "/suppliers", label: "الموردين" },
  { href: "/purchases", label: "المشتريات" },
  { href: "/warehouse", label: "المخزن المركزي" },
  { href: "/transfers", label: "نقل البضاعة" },
  { href: "/reps", label: "المناديب" },
  { href: "/customers", label: "العملاء" },
  { href: "/invoices", label: "الفواتير" },
  { href: "/invoice-requests", label: "طلبات تعديل الفواتير" },
  { href: "/returns", label: "المرتجعات" },
  { href: "/collections", label: "التحصيلات" },
  { href: "/payables", label: "مستحقات الموردين" },
  { href: "/reports", label: "التقارير" },
  { href: "/settings", label: "الإعدادات", adminOnly: true },
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

  const visibleNavItems = NAV_ITEMS.filter((item) => !item.adminOnly || profile?.role === "admin");

  return (
    <div className="flex min-h-screen bg-muted/40">
      <aside className="sticky top-0 flex h-screen w-64 shrink-0 flex-col border-l border-border bg-background p-5">
        <div className="mb-6 flex items-center gap-2 px-1">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-sm font-bold text-primary-foreground">
            و
          </div>
          <p className="text-sm font-semibold">لوحة التحكم</p>
        </div>
        <div className="mb-4 rounded-xl bg-muted px-3.5 py-3">
          <p className="text-sm font-semibold">{profile?.name}</p>
          <p className="text-xs text-muted-foreground">
            {profile?.role === "admin" ? "أدمن" : "محاسب"}
          </p>
        </div>
        <div className="flex-1 overflow-y-auto">
          <AdminNav items={visibleNavItems} />
        </div>
      </aside>
      <main className="flex-1 p-6 sm:p-8">
        <div className="mx-auto max-w-6xl">{children}</div>
      </main>
    </div>
  );
}
