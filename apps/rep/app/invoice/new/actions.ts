"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@system2026/database/server";
import { createInvoiceSchema } from "@system2026/validation";

export type CreateInvoiceActionState = { error?: string; invoiceId?: string };

export async function createInvoiceAction(
  _prevState: CreateInvoiceActionState,
  formData: FormData,
): Promise<CreateInvoiceActionState> {
  const rawItems = formData.get("items");
  let items: unknown;
  try {
    items = JSON.parse(typeof rawItems === "string" ? rawItems : "[]");
  } catch {
    return { error: "بيانات البنود غير صالحة" };
  }

  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "الجلسة منتهية، يرجى إعادة تسجيل الدخول" };

  const parsed = createInvoiceSchema.safeParse({
    repId: user.id,
    customerId: formData.get("customerId"),
    items,
    paymentMethod: formData.get("paymentMethod"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "بيانات الفاتورة غير صالحة" };
  }

  const { data: invoiceId, error } = await supabase.rpc("create_invoice_with_stock_check", {
    p_rep_id: parsed.data.repId,
    p_customer_id: parsed.data.customerId,
    p_items: parsed.data.items.map((item) => ({
      product_id: item.productId,
      unit_id: item.unitId,
      quantity_in_unit: item.quantityInUnit,
      unit_price: item.unitPrice,
    })),
    p_payment_method: parsed.data.paymentMethod,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/route");
  return { invoiceId: invoiceId ?? undefined };
}
