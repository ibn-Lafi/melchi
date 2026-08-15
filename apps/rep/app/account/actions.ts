"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@system2026/database/server";
import { updateOwnNameSchema, updateOwnPasswordSchema } from "@system2026/validation";
import type { ActionState } from "../../components/action-form";

export async function updateOwnNameAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = updateOwnNameSchema.safeParse({ name: formData.get("name") });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "بيانات غير صالحة" };

  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "الجلسة منتهية، سجّل الدخول مجددًا" };

  const { error } = await supabase.from("profiles").update({ name: parsed.data.name }).eq("id", user.id);
  if (error) return { error: error.message };

  revalidatePath("/account");
  return { success: true };
}

export async function updateOwnPasswordAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = updateOwnPasswordSchema.safeParse({ password: formData.get("password") });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "بيانات غير صالحة" };

  const supabase = createSupabaseServerClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) return { error: error.message };

  return { success: true };
}
