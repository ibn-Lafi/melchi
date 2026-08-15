"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@system2026/database/server";
import { loginSchema } from "@system2026/validation";
import { DASHBOARD_ROLES, type StaffRole } from "../../../lib/permissions";

export type LoginActionState = { error?: string };

export async function loginAction(
  _prevState: LoginActionState,
  formData: FormData,
): Promise<LoginActionState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "بيانات غير صالحة" };
  }

  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error || !data.user) {
    return { error: "البريد الإلكتروني أو كلمة المرور غير صحيحة" };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select<"role, is_active", { role: StaffRole; is_active: boolean }>("role, is_active")
    .eq("id", data.user.id)
    .single();

  if (!profile?.is_active || !DASHBOARD_ROLES.includes(profile.role)) {
    await supabase.auth.signOut();
    return { error: "هذا الحساب غير مصرّح له بالدخول للوحة التحكم" };
  }

  redirect("/");
}
