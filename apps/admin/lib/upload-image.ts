import type { createSupabaseServerClient } from "@system2026/database/server";

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

// يرفع ملف صورة من FormData إلى bucket محدد بـ Supabase Storage (عام
// بالقراءة، أدمن فقط بالكتابة عبر RLS — راجع migrations الصور).
// يُرجع الرابط العام، أو undefined إن لم يُرفق ملف بهذا الحقل.
export async function uploadImage(
  supabase: ReturnType<typeof createSupabaseServerClient>,
  formData: FormData,
  fieldName: string,
  bucket: string,
): Promise<{ url?: string; error?: string }> {
  const file = formData.get(fieldName);
  if (!(file instanceof File) || file.size === 0) return {};

  if (file.size > MAX_IMAGE_BYTES) {
    return { error: "حجم الصورة يجب ألا يتجاوز 5 ميجابايت" };
  }
  if (!file.type.startsWith("image/")) {
    return { error: "الملف المرفوع يجب أن يكون صورة" };
  }

  const ext = file.name.split(".").pop() ?? "jpg";
  const path = `${crypto.randomUUID()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from(bucket)
    .upload(path, file, { contentType: file.type, upsert: true });

  if (uploadError) return { error: uploadError.message };

  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return { url: data.publicUrl };
}
