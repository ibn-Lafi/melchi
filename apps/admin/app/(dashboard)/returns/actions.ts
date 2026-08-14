"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@system2026/database/server";
import { createReturnSchema } from "@system2026/validation";

export type ReturnActionState = { error?: string; returnId?: string };

export async function createReturnAction(
  _prevState: ReturnActionState,
  formData: FormData,
): Promise<ReturnActionState> {
  const rawItems = formData.get("items");
  let items: unknown;
  try {
    items = JSON.parse(typeof rawItems === "string" ? rawItems : "[]");
  } catch {
    return { error: "بيانات البنود غير صالحة" };
  }

  const invoiceId = formData.get("invoiceId");
  const repId = formData.get("repId");

  const parsed = createReturnSchema.safeParse({
    customerId: formData.get("customerId"),
    invoiceId: invoiceId ? invoiceId : undefined,
    repId: repId ? repId : undefined,
    items,
  });

  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "بيانات المرتجع غير صالحة" };

  const supabase = createSupabaseServerClient();
  const { data: returnId, error } = await supabase.rpc("process_return", {
    p_customer_id: parsed.data.customerId,
    p_invoice_id: parsed.data.invoiceId ?? null,
    p_rep_id: parsed.data.repId ?? null,
    p_items: parsed.data.items.map((item) => ({
      product_id: item.productId,
      quantity: item.quantity,
      unit_price: item.unitPrice,
      condition: item.condition,
    })),
  });

  if (error) return { error: error.message };

  revalidatePath("/returns");
  return { returnId: returnId ?? undefined };
}
