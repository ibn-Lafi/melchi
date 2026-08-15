import { Card, Input, PageHeader, Breadcrumb } from "@system2026/ui";
import { createSupabaseServerClient } from "@system2026/database/server";
import { ActionForm } from "../../../components/action-form";
import { getCurrentUserRole } from "../../../lib/get-current-role";
import { updateSystemSettingsAction } from "./actions";

type Settings = {
  company_name: string;
  vat_registration_number: string;
  commercial_registration_number: string;
  company_address: string;
  invoice_edit_grace_period_minutes: number;
  expiry_alert_days_threshold: number;
};

export default async function SettingsPage() {
  const supabase = createSupabaseServerClient();
  const role = await getCurrentUserRole();
  const { data: settings } = await supabase
    .from("system_settings")
    .select<
      "company_name, vat_registration_number, commercial_registration_number, company_address, invoice_edit_grace_period_minutes, expiry_alert_days_threshold",
      Settings
    >(
      "company_name, vat_registration_number, commercial_registration_number, company_address, invoice_edit_grace_period_minutes, expiry_alert_days_threshold",
    )
    .eq("id", 1)
    .single();

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumb={<Breadcrumb items={["لوحة التحكم", "الإعدادات"]} />}
        title="إعدادات النظام"
        subtitle="بيانات الشركة تظهر بترويسة كل فاتورة وتُستخدم بتوليد QR (راجع requirements.md §8.1)"
      />

      {role === "admin" ? (
        <Card className="max-w-lg">
          <ActionForm action={updateSystemSettingsAction} className="space-y-3">
            <div>
              <label className="mb-1 block text-sm">اسم الشركة</label>
              <Input name="companyName" defaultValue={settings?.company_name ?? ""} required />
            </div>
            <div>
              <label className="mb-1 block text-sm">الرقم الضريبي (VAT Registration Number)</label>
              <Input
                name="vatRegistrationNumber"
                dir="ltr"
                defaultValue={settings?.vat_registration_number ?? ""}
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-sm">رقم السجل التجاري</label>
              <Input
                name="commercialRegistrationNumber"
                dir="ltr"
                defaultValue={settings?.commercial_registration_number ?? ""}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm">عنوان الشركة</label>
              <Input name="companyAddress" defaultValue={settings?.company_address ?? ""} />
            </div>
            <div>
              <label className="mb-1 block text-sm">
                فترة سماح تعديل/إلغاء الفاتورة (دقيقة) — راجع requirements.md §7.7
              </label>
              <Input
                name="invoiceEditGracePeriodMinutes"
                type="number"
                min={1}
                defaultValue={settings?.invoice_edit_grace_period_minutes ?? 30}
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-sm">تنبيه قرب انتهاء الصلاحية (عدد الأيام)</label>
              <Input
                name="expiryAlertDaysThreshold"
                type="number"
                min={1}
                defaultValue={settings?.expiry_alert_days_threshold ?? 30}
                required
              />
            </div>
          </ActionForm>
        </Card>
      ) : (
        <Card className="max-w-lg text-sm">
          <p>
            <span className="text-foreground/60">اسم الشركة: </span>
            {settings?.company_name}
          </p>
          <p className="mt-2">
            <span className="text-foreground/60">الرقم الضريبي: </span>
            {settings?.vat_registration_number}
          </p>
        </Card>
      )}
    </div>
  );
}
