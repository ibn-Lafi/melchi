"use server";

import { revalidatePath } from "next/cache";
import { createStaffUserSchema } from "@system2026/validation";
import { createSupabaseAdminClient } from "../../../lib/supabase-admin";
import { createSupabaseServerClient } from "@system2026/database/server";
import { getCurrentUserRole } from "../../../lib/get-current-role";
import { hasPermission } from "../../../lib/permissions";
import type { ActionState } from "../../../components/action-form";

export async function createRepAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  // إنشاء المستخدم يتم بصلاحية service_role (تتجاوز RLS)، فالتحقق من
  // الصلاحية هنا إلزامي صراحةً — إخفاء الزر بالواجهة وحده لا يكفي.
  if (!hasPermission(await getCurrentUserRole(), "manage_reps")) {
    return { error: "غير مصرح لك بإضافة مندوب" };
  }

  const parsed = createStaffUserSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    phone: formData.get("phone") || undefined,
    password: formData.get("password"),
    role: "rep",
  });

  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "بيانات غير صالحة" };

  const supabaseAdmin = createSupabaseAdminClient();
  const { error } = await supabaseAdmin.auth.admin.createUser({
    email: parsed.data.email,
    password: parsed.data.password,
    email_confirm: true,
    user_metadata: { name: parsed.data.name, phone: parsed.data.phone ?? null, role: parsed.data.role },
  });

  if (error) return { error: error.message };

  revalidatePath("/reps");
  return { success: true };
}

// إيقاف/تفعيل حساب مندوب — لا يُلغي حسابه، فقط يمنعه من تسجيل الدخول
// لاحقًا (راجع apps/rep/app/(auth)/login/actions.ts الذي يتحقق من is_active).
export async function toggleRepActiveAction(formData: FormData): Promise<void> {
  const repId = formData.get("repId");
  const nextIsActive = formData.get("nextIsActive") === "true";
  if (typeof repId !== "string") return;

  const supabase = createSupabaseServerClient();
  await supabase.from("profiles").update({ is_active: nextIsActive }).eq("id", repId);

  revalidatePath("/reps");
}
