"use server";

import { revalidatePath } from "next/cache";
import { createStaffUserSchema } from "@system2026/validation";
import { createSupabaseAdminClient } from "../../../lib/supabase-admin";
import type { ActionState } from "../../../components/action-form";

export async function createRepAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = createStaffUserSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    phone: formData.get("phone") || undefined,
    password: formData.get("password"),
    role: "rep",
  });

  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "بيانات غير صالحة" };

  const supabaseAdmin = createSupabaseAdminClient();
  const { error } = await supabaseAdmin.auth.admin.createUser({
    email: parsed.data.email,
    password: parsed.data.password,
    email_confirm: true,
    user_metadata: { name: parsed.data.name, phone: parsed.data.phone ?? null, role: parsed.data.role },
  });

  if (error) return { error: error.message };

  revalidatePath("/reps");
  return { success: true };
}
