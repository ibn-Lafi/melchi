"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@system2026/database/server";
import { updateStoreThemeSchema } from "@system2026/validation";
import type { ActionState } from "../../../../components/action-form";

export async function updateStoreThemeAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = updateStoreThemeSchema.safeParse({
    useDefaultTheme: formData.get("useDefaultTheme") === "on",
    customCss: formData.get("customCss") || undefined,
    customHtml: formData.get("customHtml") || undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "بيانات غير صالحة" };

  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase
    .from("store_settings")
    .update({
      custom_css: parsed.data.useDefaultTheme ? null : parsed.data.customCss || null,
      custom_html: parsed.data.useDefaultTheme ? null : parsed.data.customHtml || null,
      updated_by: user?.id,
    })
    .eq("id", 1);

  if (error) return { error: error.message };
  revalidatePath("/store/theme");
  return { success: true };
}
