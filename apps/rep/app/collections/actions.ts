"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@system2026/database/server";
import { recordCustomerPaymentSchema } from "@system2026/validation";

export type RecordPaymentActionState = { error?: string; success?: boolean; paymentId?: string };

export async function recordPaymentAction(
  _prevState: RecordPaymentActionState,
  formData: FormData,
): Promise<RecordPaymentActionState> {
  const invoiceIdRaw = formData.get("invoiceId");
  const parsed = recordCustomerPaymentSchema.safeParse({
    customerId: formData.get("customerId"),
    invoiceId: invoiceIdRaw ? invoiceIdRaw : undefined,
    amount: Number(formData.get("amount")),
    method: formData.get("method"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "بيانات غير صالحة" };
  }

  const supabase = createSupabaseServerClient();
  const { data: paymentId, error } = await supabase.rpc("record_customer_payment", {
    p_customer_id: parsed.data.customerId,
    p_invoice_id: parsed.data.invoiceId ?? null,
    p_amount: parsed.data.amount,
    p_method: parsed.data.method,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/invoices");
  revalidatePath("/route");
  return { success: true, paymentId: paymentId ?? undefined };
}

export type CollectionCustomer = { id: string; name: string; shopName: string | null };

// عملاء خط سير المندوب — RLS تُقيّد النتيجة تلقائيًا للعملاء المرتبطين به.
export async function getCollectionCustomersAction(): Promise<CollectionCustomer[]> {
  const supabase = createSupabaseServerClient();
  const { data } = await supabase
    .from("customers")
    .select<"id, name, shop_name", { id: string; name: string; shop_name: string | null }>(
      "id, name, shop_name",
    )
    .order("name");

  return (data ?? []).map((c) => ({ id: c.id, name: c.name, shopName: c.shop_name }));
}

export type UnpaidInvoice = {
  id: string;
  invoiceNumber: number;
  invoiceDate: string;
  totalAmount: number;
  paidAmount: number;
  status: "unpaid" | "partial";
};

// فواتير العميل غير المسددة أو المسددة جزئيًا فقط، مع مجموع ما تم تحصيله
// فعليًا لكل فاتورة (لحساب المبلغ المتبقي وتحديد الحد الأقصى للتحصيل).
export async function getCustomerUnpaidInvoicesAction(customerId: string): Promise<UnpaidInvoice[]> {
  const supabase = createSupabaseServerClient();
  const { data: invoices } = await supabase
    .from("invoices")
    .select<
      "id, invoice_number, invoice_date, total_amount, status",
      { id: string; invoice_number: number; invoice_date: string; total_amount: number; status: string }
    >("id, invoice_number, invoice_date, total_amount, status")
    .eq("customer_id", customerId)
    .in("status", ["unpaid", "partial"])
    .order("invoice_date", { ascending: false });

  const invoiceIds = (invoices ?? []).map((i) => i.id);
  const { data: payments } =
    invoiceIds.length > 0
      ? await supabase
          .from("payments")
          .select<"invoice_id, amount", { invoice_id: string | null; amount: number }>("invoice_id, amount")
          .in("invoice_id", invoiceIds)
      : { data: [] as { invoice_id: string | null; amount: number }[] };

  const paidByInvoice = new Map<string, number>();
  for (const p of payments ?? []) {
    if (!p.invoice_id) continue;
    paidByInvoice.set(p.invoice_id, (paidByInvoice.get(p.invoice_id) ?? 0) + p.amount);
  }

  return (invoices ?? []).map((inv) => ({
    id: inv.id,
    invoiceNumber: inv.invoice_number,
    invoiceDate: inv.invoice_date,
    totalAmount: inv.total_amount,
    paidAmount: paidByInvoice.get(inv.id) ?? 0,
    status: inv.status as "unpaid" | "partial",
  }));
}
