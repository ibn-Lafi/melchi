import { redirect } from "next/navigation";
import Link from "next/link";
import { Card, Textarea, Button, PageHeader, Breadcrumb } from "@system2026/ui";
import { createSupabaseServerClient } from "@system2026/database/server";
import { ActionForm } from "../../../../components/action-form";
import { getCurrentUserRole } from "../../../../lib/get-current-role";
import { hasPermission } from "../../../../lib/permissions";
import { updateStoreThemeAction, resetStoreThemeAction } from "./actions";

const DEFAULT_THEME_CSS = `:root {
  --background: 0 0% 100%;
  --foreground: 0 0% 4%;
  --muted: 0 0% 95%;
  --muted-foreground: 0 0% 42%;
  --border: 0 0% 88%;
  --ring: 0 0% 4%;
  --primary: 0 0% 4%;
  --primary-foreground: 0 0% 100%;
  --destructive: 0 0% 4%;
  --destructive-foreground: 0 0% 100%;
  --radius: 1.125rem;
}`;

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
        breadcrumb={<Breadcrumb items={["لوحة التحكم", "المتجر الإلكتروني", "الثيم"]} />}
        title="ثيم المتجر"
        subtitle="الثيم الافتراضي (أسود وأبيض) مطبّق دائمًا، وتقدر تتجاوزه بكود CSS مخصص، وتضيف قسمًا بمحتوى HTML حر بالرئيسية"
        actions={
          <Link href="/store">
            <Button variant="outline">رجوع لإعدادات المتجر</Button>
          </Link>
        }
      />

      <Card>
        <h2 className="font-semibold">الثيم الافتراضي (مرجع)</h2>
        <p className="mt-1 text-sm text-foreground/60">
          متغيرات الألوان الحالية بالمتجر — استخدم نفس الأسماء بحقل CSS المخصص أدناه لتغيير أي منها
        </p>
        <pre dir="ltr" className="mt-3 overflow-x-auto rounded-xl bg-muted p-4 text-xs leading-relaxed">
          {DEFAULT_THEME_CSS}
        </pre>
      </Card>

      <Card>
        <h2 className="font-semibold">تخصيص الثيم</h2>
        <p className="mt-1 text-sm text-foreground/60">
          هذا الكود يُنفَّذ مباشرة على المتجر الفعلي لكل الزوار — تأكد من صحته قبل الحفظ. لا تلصق كودًا من مصدر لا
          تثق به.
        </p>
        <ActionForm action={updateStoreThemeAction} className="mt-4 space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium">CSS مخصص</label>
            <Textarea
              name="customCss"
              dir="ltr"
              rows={8}
              className="font-mono"
              placeholder=":root { --primary: 220 90% 45%; }"
              defaultValue={settings?.custom_css ?? ""}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">HTML مخصص (قسم إضافي بالصفحة الرئيسية)</label>
            <Textarea
              name="customHtml"
              dir="ltr"
              rows={8}
              className="font-mono"
              placeholder="<div>محتوى حر...</div>"
              defaultValue={settings?.custom_html ?? ""}
            />
          </div>
        </ActionForm>

        <form action={resetStoreThemeAction} className="mt-4 border-t border-border pt-4">
          <Button type="submit" variant="outline" size="sm">
            استعادة الثيم الافتراضي (حذف كل تخصيص)
          </Button>
        </form>
      </Card>
    </div>
  );
}
