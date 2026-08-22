import "server-only";
import { randomBytes } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

// لا توجد أي آلية اليوم لإنشاء أول حساب أدمن بمشروع عميل جديد (يتم يدويًا
// حاليًا عبر Supabase Dashboard للمشروع الوحيد الحالي) — هذه أول خطوة تفعله
// برمجيًا. الـ trigger الموجود بالفعل بكل مشروع (handle_new_user، من
// packages/database/migrations) يتكفّل بإنشاء صف profiles تلقائيًا فور
// إدراج المستخدم بـ auth.users، قارئًا role من user_metadata.
export async function createFirstAdminUser(input: {
  projectUrl: string;
  serviceRoleKey: string;
  contactEmail: string;
  contactName: string;
}): Promise<{ temporaryPassword: string | null; alreadyExisted: boolean }> {
  const supabase = createClient(input.projectUrl, input.serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const temporaryPassword = randomBytes(18).toString("base64url");

  const { error } = await supabase.auth.admin.createUser({
    email: input.contactEmail,
    password: temporaryPassword,
    email_confirm: true,
    user_metadata: { role: "admin", name: input.contactName },
  });

  if (error) {
    // إعادة محاولة بعد فشل بخطوة لاحقة قد تصل هنا مجددًا بمشروع سبق أن أُنشئ
    // فيه هذا المستخدم فعليًا — هذا نجاح (idempotent) وليس فشلًا. لا يمكن
    // استرجاع كلمة المرور الأصلية (لم تُخزَّن)، فتُعاد null صراحةً.
    const alreadyExists = /already.*registered|already.*exists/i.test(error.message);
    if (alreadyExists) return { temporaryPassword: null, alreadyExisted: true };

    throw new Error(`فشل إنشاء أول حساب أدمن بمشروع ${input.projectUrl}: ${error.message}`);
  }

  return { temporaryPassword, alreadyExisted: false };
}
