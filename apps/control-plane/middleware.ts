import { NextResponse, type NextRequest } from "next/server";
import { updateSupabaseSession } from "@system2026/database/middleware";

// نفس نمط apps/admin/middleware.ts بالضبط — تسجيل دخول عادي عبر Supabase
// Auth (بريد/كلمة مرور)، وليس مفتاحًا/كلمة مرور ثابتة مشتركة. لا يوجد
// جدول profiles/أدوار هنا بعد (مشغّل واحد بهذه المرحلة) — أي مستخدم مسجَّل
// بمشروع Supabase الخاص بهذا التطبيق مصرَّح له تلقائيًا.
const PUBLIC_PATHS = ["/login"];

export async function middleware(request: NextRequest) {
  const { response, user } = await updateSupabaseSession(request);
  const isPublicPath = PUBLIC_PATHS.some((path) => request.nextUrl.pathname.startsWith(path));

  if (!user && !isPublicPath) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (user && isPublicPath) {
    return NextResponse.redirect(new URL("/tenants", request.url));
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
