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
    phone: formData.get("phone"),
    password: formData.get("password"),
    role: "rep",
  });

  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "بيانات غير صالحة" };

  const supabaseAdmin = createSupabaseAdminClient();
  const { error } = await supabaseAdmin.auth.admin.createUser({
    phone: parsed.data.phone,
    password: parsed.data.password,
    phone_confirm: true,
    user_metadata: { name: parsed.data.name, phone: parsed.data.phone, role: parsed.data.role },
  });

  if (error) return { error: error.message };

  revalidatePath("/reps");
  return { success: true };
}
