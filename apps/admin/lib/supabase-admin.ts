import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@system2026/database";

// service_role key — لا يُستخدم إلا هنا (Server Action)، ولا يُمرَّر أبدًا
// للفرونت إند أو المتصفح. راجع CLAUDE.md §4.4.
export function createSupabaseAdminClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}
