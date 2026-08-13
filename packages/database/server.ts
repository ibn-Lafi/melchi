// عميل Supabase لـ Server Components / Server Actions — anon key + جلسة المستخدم
// من الكوكيز (RLS يُطبَّق حسب هوية المستخدم، وليس صلاحيات مرتفعة)
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "./types";

type CookieToSet = { name: string; value: string; options: CookieOptions };

export function createSupabaseServerClient() {
  const cookieStore = cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: CookieToSet[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // يُستدعى أحيانًا من Server Component بدل Server Action/Route Handler،
            // حيث لا يمكن تعديل الكوكيز — middleware.ts يتكفّل بتجديد الجلسة حينها.
          }
        },
      },
    },
  );
}
