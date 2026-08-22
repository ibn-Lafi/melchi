"use server";

import { revalidatePath } from "next/cache";
import { retryTenantProvisioning } from "../../../../lib/provisioning/orchestrator";

// إعادة محاولة تزويد فاشل — نموذج بزر واحد بلا تأكيد إضافي (توقيع بمعامل
// واحد لأنه <form action> مباشر وليس عبر useFormState). فشل الخطوة نفسها
// مسجَّل مسبقًا بجدول tenant_provisioning_steps داخل retryTenantProvisioning
// — لا حاجة لإظهار خطأ JS إضافي هنا، الصفحة تعرض الحالة المحدَّثة بعد
// إعادة التحميل مباشرة.
export async function retryProvisioningAction(formData: FormData): Promise<void> {
  const tenantId = formData.get("tenantId");
  if (typeof tenantId !== "string") return;

  try {
    await retryTenantProvisioning(tenantId);
  } catch {
    // مسجَّل بالفعل — راجع الملاحظة أعلاه.
  }

  revalidatePath(`/tenants/${tenantId}`);
}
