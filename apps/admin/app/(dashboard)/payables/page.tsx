import { Card } from "@system2026/ui";
import { formatCurrency } from "@system2026/utils";
import { createSupabaseServerClient } from "@system2026/database/server";
import { getCurrentUserRole } from "../../../lib/get-current-role";
import { SupplierPaymentForm } from "./payment-form";

type Supplier = { id: string; name: string };
type PurchaseInvoiceRow = { id: string; supplier_id: string; total_amount: number };
type SupplierPaymentRow = { purchase_invoice_id: string | null; amount: number };

export default async function PayablesPage() {
  const supabase = createSupabaseServerClient();
  const role = await getCurrentUserRole();

  const [{ data: suppliers }, { data: unpaidInvoices }, { data: payments }] = await Promise.all([
    supabase.from("suppliers").select<"id, name", Supplier>("id, name").order("name"),
    supabase
      .from("purchase_invoices")
      .select<
        "id, supplier_id, total_amount",
        PurchaseInvoiceRow
      >("id, supplier_id, total_amount")
      .in("payment_status", ["unpaid", "partial"]),
    supabase
      .from("supplier_payments")
      .select<"purchase_invoice_id, amount", SupplierPaymentRow>("purchase_invoice_id, amount"),
  ]);

  const paidByInvoice = new Map<string, number>();
  for (const p of payments ?? []) {
    if (!p.purchase_invoice_id) continue;
    paidByInvoice.set(p.purchase_invoice_id, (paidByInvoice.get(p.purchase_invoice_id) ?? 0) + p.amount);
  }

  const invoicesBySupplier: Record<string, { id: string; remaining: number }[]> = {};
  const owedBySupplier = new Map<string, number>();
  for (const inv of unpaidInvoices ?? []) {
    const remaining = inv.total_amount - (paidByInvoice.get(inv.id) ?? 0);
    if (remaining <= 0) continue;
    invoicesBySupplier[inv.supplier_id] ??= [];
    invoicesBySupplier[inv.supplier_id]!.push({ id: inv.id, remaining });
    owedBySupplier.set(inv.supplier_id, (owedBySupplier.get(inv.supplier_id) ?? 0) + remaining);
  }

  const supplierNameById = new Map((suppliers ?? []).map((s) => [s.id, s.name]));
  const suppliersWithDebt = Array.from(owedBySupplier.entries()).sort((a, b) => b[1] - a[1]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">مستحقات الموردين</h1>

      <Card>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-right text-foreground/60">
              <th className="py-2">المورد</th>
              <th>المستحق</th>
            </tr>
          </thead>
          <tbody>
            {suppliersWithDebt.map(([supplierId, owed]) => (
              <tr key={supplierId} className="border-b border-border/50">
                <td className="py-2">{supplierNameById.get(supplierId) ?? "—"}</td>
                <td className="font-semibold">{formatCurrency(owed)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {suppliersWithDebt.length === 0 ? (
          <p className="py-4 text-foreground/60">لا توجد مستحقات حاليًا</p>
        ) : null}
      </Card>

      {role === "admin" ? (
        <Card>
          <h2 className="mb-3 font-semibold">تسجيل دفعة لمورد</h2>
          {(suppliers?.length ?? 0) === 0 ? (
            <p className="text-foreground/60">لا يوجد موردين بعد</p>
          ) : (
            <SupplierPaymentForm suppliers={suppliers ?? []} invoicesBySupplier={invoicesBySupplier} />
          )}
        </Card>
      ) : null}
    </div>
  );
}
