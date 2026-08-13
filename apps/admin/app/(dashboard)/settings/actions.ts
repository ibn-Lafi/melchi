"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@system2026/database/server";
import { updateSystemSettingsSchema } from "@system2026/validation";
import type { ActionState } from "../../../components/action-form";

export async function updateSystemSettingsAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = updateSystemSettingsSchema.safeParse({
    companyName: formData.get("companyName"),
    vatRegistrationNumber: formData.get("vatRegistrationNumber"),
    commercialRegistrationNumber: formData.get("commercialRegistrationNumber") || undefined,
    companyAddress: formData.get("companyAddress") || undefined,
    invoiceEditGracePeriodMinutes: Number(formData.get("invoiceEditGracePeriodMinutes")),
    expiryAlertDaysThreshold: Number(formData.get("expiryAlertDaysThreshold")),
  });

  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "بيانات غير صالحة" };

  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase
    .from("system_settings")
    .update({
      company_name: parsed.data.companyName,
      vat_registration_number: parsed.data.vatRegistrationNumber,
      commercial_registration_number: parsed.data.commercialRegistrationNumber ?? "",
      company_address: parsed.data.companyAddress ?? "",
      invoice_edit_grace_period_minutes: parsed.data.invoiceEditGracePeriodMinutes,
      expiry_alert_days_threshold: parsed.data.expiryAlertDaysThreshold,
      updated_by: user?.id,
    })
    .eq("id", 1);

  if (error) return { error: error.message };

  revalidatePath("/settings");
  return { success: true };
}
