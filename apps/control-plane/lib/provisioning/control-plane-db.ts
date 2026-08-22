import "server-only";
import { createClient } from "@supabase/supabase-js";

// عميل Supabase لمشروع لوحة التحكم نفسها (منفصل تمامًا عن أي مشروع عميل) —
// service_role فقط، لا يُستخدم إلا هنا من كود سيرفر/سكربتات. راجع CLAUDE.md
// §4.4 (نفس القاعدة تنطبق على هذا المشروع أيضًا).
//
// يستخدم نفس أسماء متغيرات البيئة المتبعة بـ apps/admin
// (NEXT_PUBLIC_SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY) عمدًا، لأن هذا
// المشروع فعليًا هو "مشروع Supabase الخاص بتطبيق control-plane" بنفس معنى
// أن admin/rep/store كل واحد له مشروعه — لا حاجة لأسماء متغيرات مختلفة، وهذا
// يسمح أيضًا بإعادة استخدام packages/database/{client,server,middleware}.ts
// كما هي لتسجيل الدخول (راجع middleware.ts وapp/(auth)/login).
export function createControlPlaneClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error("متغيرات بيئة لوحة التحكم غير مكتملة: NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY");
  }

  return createClient(url, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });
}
