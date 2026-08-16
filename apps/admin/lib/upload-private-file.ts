import type { createSupabaseServerClient } from "@system2026/database/server";

const MAX_FILE_BYTES = 10 * 1024 * 1024;
const ALLOWED_TYPES = ["application/pdf", "image/jpeg", "image/png", "image/webp"];

// يرفع ملف من FormData إلى bucket خاص (غير عام) بـ Supabase Storage — يُرجع
// مسار الملف فقط (وليس رابطًا) لأن القراءة تتم لاحقًا عبر signed URL مؤقت،
// وليس رابطًا عامًا دائمًا (راجع migration مرفقات فواتير الشراء).
export async function uploadPrivateFile(
  supabase: ReturnType<typeof createSupabaseServerClient>,
  formData: FormData,
  fieldName: string,
  bucket: string,
): Promise<{ path?: string; error?: string }> {
  const file = formData.get(fieldName);
  if (!(file instanceof File) || file.size === 0) return {};

  if (file.size > MAX_FILE_BYTES) {
    return { error: "حجم الملف يجب ألا يتجاوز 10 ميجابايت" };
  }
  if (!ALLOWED_TYPES.includes(file.type)) {
    return { error: "الملف المرفوع يجب أن يكون صورة (JPG/PNG/WEBP) أو PDF" };
  }

  const ext = file.name.split(".").pop() ?? "pdf";
  const path = `${crypto.randomUUID()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from(bucket)
    .upload(path, file, { contentType: file.type, upsert: true });

  if (uploadError) return { error: uploadError.message };

  return { path };
}
