import { createSupabaseServerClient } from "@system2026/database/server";

export type OutstandingInvoice = {
  id: string;
  invoiceNumber: number | null;
  total: number;
  remaining: number;
};

export type OutstandingBalances = {
  invoicesByEntity: Record<string, OutstandingInvoice[]>;
  debtByEntity: Map<string, number>;
  totalDebt: number;
};

// ديون العملاء المستحقة (فواتير غير مدفوعة/جزئي - الدفعات المسجّلة) — راجع
// requirements.md §11. مُستخدمة بصفحات التحصيلات، كشف حساب العميل، والتقارير.
export async function getCustomerOutstandingBalances(): Promise<OutstandingBalances> {
  const supabase = createSupabaseServerClient();

  const [{ data: unpaidInvoices }, { data: payments }] = await Promise.all([
    supabase
      .from("invoices")
      .select<
        "id, invoice_number, customer_id, total_amount",
        { id: string; invoice_number: number; customer_id: string; total_amount: number }
      >("id, invoice_number, customer_id, total_amount")
      .in("status", ["unpaid", "partial"]),
    supabase
      .from("payments")
      .select<"invoice_id, amount", { invoice_id: string | null; amount: number }>("invoice_id, amount"),
  ]);

  const paidByInvoice = new Map<string, number>();
  for (const p of payments ?? []) {
    if (!p.invoice_id) continue;
    paidByInvoice.set(p.invoice_id, (paidByInvoice.get(p.invoice_id) ?? 0) + p.amount);
  }

  const invoicesByEntity: Record<string, OutstandingInvoice[]> = {};
  const debtByEntity = new Map<string, number>();
  let totalDebt = 0;
  for (const inv of unpaidInvoices ?? []) {
    const remaining = inv.total_amount - (paidByInvoice.get(inv.id) ?? 0);
    if (remaining <= 0) continue;
    invoicesByEntity[inv.customer_id] ??= [];
    invoicesByEntity[inv.customer_id]!.push({
      id: inv.id,
      invoiceNumber: inv.invoice_number,
      total: inv.total_amount,
      remaining,
    });
    debtByEntity.set(inv.customer_id, (debtByEntity.get(inv.customer_id) ?? 0) + remaining);
    totalDebt += remaining;
  }

  return { invoicesByEntity, debtByEntity, totalDebt };
}

// مستحقات الموردين (فواتير شراء غير مدفوعة/جزئي - الدفعات المسددة) — راجع
// requirements.md §5.5. مُستخدمة بصفحات المستحقات، كشف حساب المورد، والتقارير.
export async function getSupplierOutstandingBalances(): Promise<OutstandingBalances> {
  const supabase = createSupabaseServerClient();

  const [{ data: unpaidInvoices }, { data: payments }] = await Promise.all([
    supabase
      .from("purchase_invoices")
      .select<
        "id, supplier_id, total_amount",
        { id: string; supplier_id: string; total_amount: number }
      >("id, supplier_id, total_amount")
      .in("payment_status", ["unpaid", "partial"]),
    supabase
      .from("supplier_payments")
      .select<
        "purchase_invoice_id, amount",
        { purchase_invoice_id: string | null; amount: number }
      >("purchase_invoice_id, amount"),
  ]);

  const paidByInvoice = new Map<string, number>();
  for (const p of payments ?? []) {
    if (!p.purchase_invoice_id) continue;
    paidByInvoice.set(p.purchase_invoice_id, (paidByInvoice.get(p.purchase_invoice_id) ?? 0) + p.amount);
  }

  const invoicesByEntity: Record<string, OutstandingInvoice[]> = {};
  const debtByEntity = new Map<string, number>();
  let totalDebt = 0;
  for (const inv of unpaidInvoices ?? []) {
    const remaining = inv.total_amount - (paidByInvoice.get(inv.id) ?? 0);
    if (remaining <= 0) continue;
    invoicesByEntity[inv.supplier_id] ??= [];
    invoicesByEntity[inv.supplier_id]!.push({
      id: inv.id,
      invoiceNumber: null,
      total: inv.total_amount,
      remaining,
    });
    debtByEntity.set(inv.supplier_id, (debtByEntity.get(inv.supplier_id) ?? 0) + remaining);
    totalDebt += remaining;
  }

  return { invoicesByEntity, debtByEntity, totalDebt };
}
