"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@system2026/database/server";
import { recordSupplierPaymentSchema } from "@system2026/validation";
import type { ActionState } from "../../../components/action-form";

export async function recordSupplierPaymentAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const purchaseInvoiceIdRaw = formData.get("purchaseInvoiceId");
  const parsed = recordSupplierPaymentSchema.safeParse({
    supplierId: formData.get("supplierId"),
    purchaseInvoiceId: purchaseInvoiceIdRaw ? purchaseInvoiceIdRaw : undefined,
    amount: Number(formData.get("amount")),
    method: formData.get("method"),
  });

  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "بيانات غير صالحة" };

  const supabase = createSupabaseServerClient();
  const { error } = await supabase.rpc("record_supplier_payment", {
    p_supplier_id: parsed.data.supplierId,
    p_purchase_invoice_id: parsed.data.purchaseInvoiceId ?? null,
    p_amount: parsed.data.amount,
    p_method: parsed.data.method,
  });

  if (error) return { error: error.message };

  revalidatePath("/payables");
  revalidatePath("/suppliers");
  return { success: true };
}
