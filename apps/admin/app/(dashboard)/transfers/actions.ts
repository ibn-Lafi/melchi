"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@system2026/database/server";
import { createStockTransferSchema } from "@system2026/validation";

export type TransferActionState = { error?: string; transferId?: string };

export async function createStockTransferAction(
  _prevState: TransferActionState,
  formData: FormData,
): Promise<TransferActionState> {
  const rawItems = formData.get("items");
  let items: unknown;
  try {
    items = JSON.parse(typeof rawItems === "string" ? rawItems : "[]");
  } catch {
    return { error: "بيانات البنود غير صالحة" };
  }

  const parsed = createStockTransferSchema.safeParse({
    repId: formData.get("repId"),
    items,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "بيانات النقل غير صالحة" };
  }

  const supabase = createSupabaseServerClient();
  const { data: transferId, error } = await supabase.rpc("transfer_stock_to_rep", {
    p_rep_id: parsed.data.repId,
    p_items: parsed.data.items.map((item) => ({ product_id: item.productId, quantity: item.quantity })),
  });

  if (error) return { error: error.message };

  revalidatePath("/transfers");
  revalidatePath("/warehouse");
  revalidatePath("/reps");
  return { transferId: transferId ?? undefined };
}
