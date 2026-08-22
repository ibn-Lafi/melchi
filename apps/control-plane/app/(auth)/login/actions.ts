"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@system2026/database/server";
import { loginSchema } from "@system2026/validation";

export type LoginActionState = { error?: string };

// لا يوجد جدول profiles/أدوار بمشروع لوحة التحكم — أي حساب مسجَّل بمشروع
// Supabase الخاص بهذا التطبيق مصرَّح له بالدخول تلقائيًا (مشغّل واحد فقط
// بهذه المرحلة). الحساب الأول يُنشأ يدويًا عبر Supabase Dashboard
// (Authentication → Add user)، بنفس أسلوب أول حساب أدمن بتطبيق admin.
export async function loginAction(_prevState: LoginActionState, formData: FormData): Promise<LoginActionState> {
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

  redirect("/tenants");
}

export async function logoutAction(): Promise<void> {
  const supabase = createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/login");
}
