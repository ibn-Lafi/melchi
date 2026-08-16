import type { createSupabaseServerClient } from "@system2026/database/server";

const SIGNED_URL_TTL_SECONDS = 60 * 60;

// يولّد رابطًا مؤقتًا (ساعة واحدة) لملف بـ bucket خاص — مرفقات فواتير
// الشراء ليست عامة، فلا تُستخدم getPublicUrl هنا (راجع migration المرفقات).
export async function getAttachmentSignedUrl(
  supabase: ReturnType<typeof createSupabaseServerClient>,
  bucket: string,
  path: string | null,
): Promise<string | null> {
  if (!path) return null;
  const { data } = await supabase.storage.from(bucket).createSignedUrl(path, SIGNED_URL_TTL_SECONDS);
  return data?.signedUrl ?? null;
}
