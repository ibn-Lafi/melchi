import "server-only";
import { createClient } from "@supabase/supabase-js";

// عميل Supabase لمشروع لوحة التحكم نفسها (منفصل تمامًا عن أي مشروع عميل) —
// service_role فقط، لا يُستخدم إلا هنا من كود سيرفر/سكربتات. راجع CLAUDE.md
// §4.4 (نفس القاعدة تنطبق على هذا المشروع أيضًا).
export function createControlPlaneClient() {
  const url = process.env.CONTROL_PLANE_SUPABASE_URL;
  const serviceRoleKey = process.env.CONTROL_PLANE_SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      "متغيرات بيئة لوحة التحكم غير مكتملة: CONTROL_PLANE_SUPABASE_URL / CONTROL_PLANE_SUPABASE_SERVICE_ROLE_KEY",
    );
  }

  return createClient(url, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });
}
