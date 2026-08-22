import { NextResponse, type NextRequest } from "next/server";

// حماية وصول أساسية للوحة التحكم المركزية — تعرض بيانات عملاء حساسة (أسماء
// شركات، بريد إلكتروني، مراجع بنية تحتية) وستُنشر بنطاق عام على Railway.
// مشغّل واحد فقط بهذه المرحلة (لا نظام صلاحيات متعدد الأدوار بعد)، فكلمة
// مرور واحدة عبر Basic Auth كافية حاليًا — يجب استبدالها بنظام دخول حقيقي
// لو أُضيف مشغّلون آخرون لاحقًا.
export function middleware(request: NextRequest) {
  const password = process.env.CONTROL_PLANE_ADMIN_PASSWORD;
  if (!password) {
    // بلا هذا المتغيّر لا حماية إطلاقًا — مقبول فقط أثناء التطوير المحلي.
    // بالنشر الفعلي على Railway يجب ضبطه دائمًا.
    return NextResponse.next();
  }

  const authHeader = request.headers.get("authorization");
  if (authHeader?.startsWith("Basic ")) {
    const decoded = atob(authHeader.slice("Basic ".length));
    const separatorIndex = decoded.indexOf(":");
    const providedPassword = separatorIndex === -1 ? decoded : decoded.slice(separatorIndex + 1);
    if (providedPassword === password) {
      return NextResponse.next();
    }
  }

  return new NextResponse("مطلوب تسجيل دخول", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="control-plane"' },
  });
}

export const config = {
  matcher: "/((?!_next/static|_next/image|favicon.ico).*)",
};
