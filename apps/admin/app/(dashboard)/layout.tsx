import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@system2026/database/server";

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
    <div className="flex min-h-screen">
      <aside className="w-64 shrink-0 border-l border-border p-4">
        <p className="mb-4 text-sm text-foreground/70">
          {profile?.name} — {profile?.role === "admin" ? "أدمن" : "محاسب"}
        </p>
        <nav className="flex flex-col gap-1">
          {visibleNavItems.map((item) => (
            <a key={item.href} href={item.href} className="rounded-md px-3 py-2 text-sm hover:bg-black/5">
              {item.label}
            </a>
          ))}
        </nav>
      </aside>
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}
