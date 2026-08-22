import { redirect } from "next/navigation";
import Link from "next/link";
import { Card, Button, PageHeader, Breadcrumb } from "@system2026/ui";
import { createSupabaseServerClient } from "@system2026/database/server";
import { getCurrentUserRole } from "../../../../lib/get-current-role";
import { hasPermission } from "../../../../lib/permissions";
import { ThemeForm } from "./theme-form";

type ThemeSettings = { custom_css: string | null; custom_html: string | null };

export default async function StoreThemePage() {
  const role = await getCurrentUserRole();
  if (!hasPermission(role, "manage_settings")) redirect("/");

  const supabase = createSupabaseServerClient();
  const { data: settings } = await supabase
    .from("store_settings")
    .select<"custom_css, custom_html", ThemeSettings>("custom_css, custom_html")
    .eq("id", 1)
    .single();

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumb={<Breadcrumb items={["لوحة التحكم", "المتجر الإلكتروني", "تصميم المتجر"]} />}
        title="تصميم المتجر"
        subtitle="اختر الثيم الافتراضي، أو فعّل التخصيص لتضيف CSS/HTML خاص بك"
        actions={
          <Link href="/store">
            <Button variant="outline">رجوع لإعدادات المتجر</Button>
          </Link>
        }
      />

      <Card>
        <h2 className="font-semibold">تصميم المتجر</h2>
        <p className="mt-1 text-sm text-foreground/60">
          هذا الكود يُنفَّذ مباشرة على المتجر الفعلي لكل الزوار — تأكد من صحته قبل الحفظ. لا تلصق كودًا من مصدر لا
          تثق به.
        </p>
        <div className="mt-4">
          <ThemeForm customCss={settings?.custom_css ?? null} customHtml={settings?.custom_html ?? null} />
        </div>
      </Card>
    </div>
  );
}
