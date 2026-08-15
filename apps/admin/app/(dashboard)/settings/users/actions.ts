"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@system2026/database/server";
import { createStaffUserSchema, changeUserRoleSchema, changeUserPasswordSchema } from "@system2026/validation";
import { createSupabaseAdminClient } from "../../../../lib/supabase-admin";
import { getCurrentUserRole } from "../../../../lib/get-current-role";
import { hasPermission } from "../../../../lib/permissions";

export type ActionState = { error?: string; success?: boolean };

// إدارة المستخدمين حصرًا للأدمن (manage_settings) — RLS تحمي عمليات التعديل
// المباشرة على profiles (role/is_active)، لكن الإنشاء وتغيير كلمة المرور
// يتمّان بصلاحية service_role (تتجاوز RLS)، فالتحقق هنا إلزامي صراحةً.
async function assertCanManageUsers(): Promise<string | null> {
  if (!hasPermission(await getCurrentUserRole(), "manage_settings")) {
    return "غير مصرح لك بإدارة المستخدمين";
  }
  return null;
}

export async function createStaffUserAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const authError = await assertCanManageUsers();
  if (authError) return { error: authError };

  const parsed = createStaffUserSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
    role: formData.get("role"),
  });

  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "بيانات غير صالحة" };
  if (parsed.data.role === "admin" || parsed.data.role === "rep") {
    return { error: "لا يمكن إنشاء هذا الدور من هذه الصفحة" };
  }

  const supabaseAdmin = createSupabaseAdminClient();
  const { error } = await supabaseAdmin.auth.admin.createUser({
    email: parsed.data.email,
    password: parsed.data.password,
    email_confirm: true,
    user_metadata: { name: parsed.data.name, role: parsed.data.role },
  });

  if (error) return { error: error.message };

  revalidatePath("/settings/users");
  return { success: true };
}

export async function toggleStaffUserActiveAction(formData: FormData): Promise<void> {
  if (await assertCanManageUsers()) return;

  const userId = formData.get("userId");
  const nextIsActive = formData.get("nextIsActive") === "true";
  if (typeof userId !== "string") return;

  const supabase = createSupabaseServerClient();
  await supabase.from("profiles").update({ is_active: nextIsActive }).eq("id", userId);

  revalidatePath("/settings/users");
}

export async function changeUserRoleAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const authError = await assertCanManageUsers();
  if (authError) return { error: authError };

  const parsed = changeUserRoleSchema.safeParse({
    userId: formData.get("userId"),
    role: formData.get("role"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "بيانات غير صالحة" };

  const supabase = createSupabaseServerClient();
  const { error } = await supabase
    .from("profiles")
    .update({ role: parsed.data.role })
    .eq("id", parsed.data.userId);

  if (error) return { error: error.message };

  revalidatePath("/settings/users");
  return { success: true };
}

export async function changeUserPasswordAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const authError = await assertCanManageUsers();
  if (authError) return { error: authError };

  const parsed = changeUserPasswordSchema.safeParse({
    userId: formData.get("userId"),
    password: formData.get("password"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "بيانات غير صالحة" };

  const supabaseAdmin = createSupabaseAdminClient();
  const { error } = await supabaseAdmin.auth.admin.updateUserById(parsed.data.userId, {
    password: parsed.data.password,
  });

  if (error) return { error: error.message };

  return { success: true };
}
