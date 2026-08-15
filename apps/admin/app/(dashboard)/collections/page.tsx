import { Card, PageHeader, Breadcrumb } from "@system2026/ui";
import { formatCurrency } from "@system2026/utils";
import { createSupabaseServerClient } from "@system2026/database/server";
import { getCurrentUserRole } from "../../../lib/get-current-role";
import { hasPermission } from "../../../lib/permissions";
import { PaymentForm } from "./payment-form";

type Customer = { id: string; name: string; shop_name: string | null };
type InvoiceRow = { id: string; invoice_number: number; customer_id: string; total_amount: number };
type PaymentRow = { invoice_id: string | null; amount: number };

export default async function CollectionsPage() {
  const supabase = createSupabaseServerClient();
  const role = await getCurrentUserRole();
  const canManage = hasPermission(role, "manage_collections");

  const [{ data: customers }, { data: unpaidInvoices }, { data: payments }] = await Promise.all([
    supabase
      .from("customers")
      .select<"id, name, shop_name", Customer>("id, name, shop_name")
      .order("name"),
    supabase
      .from("invoices")
      .select<
        "id, invoice_number, customer_id, total_amount",
        InvoiceRow
      >("id, invoice_number, customer_id, total_amount")
      .in("status", ["unpaid", "partial"]),
    supabase.from("payments").select<"invoice_id, amount", PaymentRow>("invoice_id, amount"),
  ]);

  const paidByInvoice = new Map<string, number>();
  for (const p of payments ?? []) {
    if (!p.invoice_id) continue;
    paidByInvoice.set(p.invoice_id, (paidByInvoice.get(p.invoice_id) ?? 0) + p.amount);
  }

  const invoicesByCustomer: Record<string, { id: string; invoice_number: number; remaining: number }[]> = {};
  const debtByCustomer = new Map<string, number>();
  for (const inv of unpaidInvoices ?? []) {
    const remaining = inv.total_amount - (paidByInvoice.get(inv.id) ?? 0);
    if (remaining <= 0) continue;
    invoicesByCustomer[inv.customer_id] ??= [];
    invoicesByCustomer[inv.customer_id]!.push({ id: inv.id, invoice_number: inv.invoice_number, remaining });
    debtByCustomer.set(inv.customer_id, (debtByCustomer.get(inv.customer_id) ?? 0) + remaining);
  }

  const customerNameById = new Map((customers ?? []).map((c) => [c.id, c.shop_name ?? c.name]));
  const customersWithDebt = Array.from(debtByCustomer.entries()).sort((a, b) => b[1] - a[1]);

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumb={<Breadcrumb items={["لوحة التحكم", "الفواتير", "التحصيلات"]} />}
        title="التحصيلات"
      />

      <Card>
        <h2 className="mb-3 font-semibold">ديون العملاء المستحقة</h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-right text-foreground/60">
              <th className="py-2">العميل</th>
              <th>المبلغ المستحق</th>
            </tr>
          </thead>
          <tbody>
            {customersWithDebt.map(([customerId, debt]) => (
              <tr key={customerId} className="border-b border-border/50">
                <td className="py-2">{customerNameById.get(customerId) ?? "—"}</td>
                <td className="font-semibold">{formatCurrency(debt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {customersWithDebt.length === 0 ? (
          <p className="py-4 text-foreground/60">لا توجد ديون مستحقة حاليًا</p>
        ) : null}
      </Card>

      {canManage ? (
        <Card>
          <h2 className="mb-3 font-semibold">تسجيل تحصيل</h2>
          {(customers?.length ?? 0) === 0 ? (
            <p className="text-foreground/60">لا يوجد عملاء بعد</p>
          ) : (
            <PaymentForm customers={customers ?? []} invoicesByCustomer={invoicesByCustomer} />
          )}
        </Card>
      ) : null}
    </div>
  );
}
