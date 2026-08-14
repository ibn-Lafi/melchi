"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@system2026/database/server";
import type { Json } from "@system2026/database";
import { cancelInvoiceSchema, requestInvoiceEditSchema } from "@system2026/validation";

export type InvoiceRequestActionState = { error?: string; success?: boolean };

export async function cancelInvoiceAction(
  _prevState: InvoiceRequestActionState,
  formData: FormData,
): Promise<InvoiceRequestActionState> {
  const parsed = cancelInvoiceSchema.safeParse({
    invoiceId: formData.get("invoiceId"),
    reason: formData.get("reason"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "بيانات غير صالحة" };

  const supabase = createSupabaseServerClient();
  const { error } = await supabase.rpc("cancel_invoice_within_grace_period", {
    p_invoice_id: parsed.data.invoiceId,
    p_reason: parsed.data.reason,
  });

  if (error) return { error: error.message };

  revalidatePath(`/invoice/${parsed.data.invoiceId}`);
  return { success: true };
}

export async function requestInvoiceCancelAction(
  _prevState: InvoiceRequestActionState,
  formData: FormData,
): Promise<InvoiceRequestActionState> {
  const parsed = requestInvoiceEditSchema.safeParse({
    invoiceId: formData.get("invoiceId"),
    reason: formData.get("reason"),
    requestedChanges: { action: "cancel" },
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "بيانات غير صالحة" };

  const supabase = createSupabaseServerClient();
  const { error } = await supabase.rpc("request_invoice_edit", {
    p_invoice_id: parsed.data.invoiceId,
    p_reason: parsed.data.reason,
    p_requested_changes: parsed.data.requestedChanges as Json,
  });

  if (error) return { error: error.message };

  revalidatePath(`/invoice/${parsed.data.invoiceId}`);
  return { success: true };
}
