"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@system2026/database/server";
import { createPurchaseInvoiceSchema } from "@system2026/validation";

export type PurchaseActionState = { error?: string; purchaseInvoiceId?: string };

export async function createPurchaseInvoiceAction(
  _prevState: PurchaseActionState,
  formData: FormData,
): Promise<PurchaseActionState> {
  const rawItems = formData.get("items");
  let items: unknown;
  try {
    items = JSON.parse(typeof rawItems === "string" ? rawItems : "[]");
  } catch {
    return { error: "بيانات البنود غير صالحة" };
  }

  const parsed = createPurchaseInvoiceSchema.safeParse({
    supplierId: formData.get("supplierId"),
    items,
    paymentStatus: formData.get("paymentStatus"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "بيانات فاتورة الشراء غير صالحة" };
  }

  const supabase = createSupabaseServerClient();
  const { data: purchaseInvoiceId, error } = await supabase.rpc("create_purchase_invoice", {
    p_supplier_id: parsed.data.supplierId,
    p_items: parsed.data.items.map((item) => ({
      product_id: item.productId,
      unit_id: item.unitId,
      quantity_in_unit: item.quantityInUnit,
      unit_cost: item.unitCost,
    })),
    p_payment_status: parsed.data.paymentStatus,
  });

  if (error) return { error: error.message };

  revalidatePath("/purchases");
  revalidatePath("/warehouse");
  return { purchaseInvoiceId: purchaseInvoiceId ?? undefined };
}
