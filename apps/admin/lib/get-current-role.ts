import { createSupabaseServerClient } from "@system2026/database/server";

export type StaffRole = "admin" | "accountant" | "rep";

// المحاسب يشوف كل شيء (RLS تسمح بذلك) لكن بدون صلاحية تعديل منتجات/مناديب/
// مخزون/موردين — راجع CLAUDE.md §5.3: "التحقق من الصلاحيات على مستويين:
// الفرونت لإخفاء عناصر الواجهة فقط + قاعدة البيانات (RLS، خط الدفاع الحقيقي)".
// هذه الدالة تخدم المستوى الأول فقط؛ RLS تمنع الكتابة فعليًا بأي الحالتين.
export async function getCurrentUserRole(): Promise<StaffRole | null> {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select<"role", { role: StaffRole }>("role")
    .eq("id", user.id)
    .single();

  return profile?.role ?? null;
}
