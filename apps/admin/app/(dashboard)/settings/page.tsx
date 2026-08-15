import { redirect } from "next/navigation";
import Link from "next/link";
import { Card, PageHeader, Breadcrumb } from "@system2026/ui";
import { getCurrentUserRole } from "../../../lib/get-current-role";
import { hasPermission } from "../../../lib/permissions";

const SECTIONS = [
  {
    href: "/settings/company",
    title: "بيانات الشركة والفوترة",
    description: "اسم الشركة، الرقم الضريبي، السجل التجاري، وفترة سماح تعديل الفواتير",
  },
  {
    href: "/settings/users",
    title: "المستخدمون",
    description: "إضافة موظفي لوحة التحكم، تحديد أدوارهم وصلاحياتهم، وتفعيل/إيقاف حساباتهم",
  },
  {
    href: "/account",
    title: "الحساب الشخصي",
    description: "بياناتك، دورك، وتعديل اسمك وكلمة المرور",
  },
];

export default async function SettingsPage() {
  const role = await getCurrentUserRole();
  if (!hasPermission(role, "manage_settings")) redirect("/");

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumb={<Breadcrumb items={["لوحة التحكم", "الإعدادات"]} />}
        title="الإعدادات"
        subtitle="اختر قسمًا لإدارته"
      />

      <div className="grid gap-4 sm:grid-cols-2">
        {SECTIONS.map((section) => (
          <Link key={section.href} href={section.href}>
            <Card className="h-full hover:shadow-card-hover">
              <h2 className="font-semibold">{section.title}</h2>
              <p className="mt-1 text-sm text-foreground/60">{section.description}</p>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
