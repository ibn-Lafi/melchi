"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@system2026/database/server";
import { adjustStockQuantitySchema } from "@system2026/validation";

export type ActionState = { error?: string; success?: boolean };

export async function adjustStockQuantityAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = adjustStockQuantitySchema.safeParse({
    productId: formData.get("productId"),
    quantity: Number(formData.get("quantity")),
    reason: formData.get("reason"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "بيانات غير صالحة" };
  }

  const supabase = createSupabaseServerClient();
  const { error } = await supabase.rpc("set_warehouse_stock_quantity", {
    p_product_id: parsed.data.productId,
    p_new_quantity: parsed.data.quantity,
    p_reason: parsed.data.reason,
  });

  if (error) return { error: error.message };

  revalidatePath("/warehouse");
  revalidatePath("/products");
  return { success: true };
}
