import { Card } from "@system2026/ui";
import { formatCurrency } from "@system2026/utils";
import { createSupabaseServerClient } from "@system2026/database/server";
import { getProductCatalog } from "../../../lib/get-product-catalog";
import { PurchaseForm } from "./purchase-form";

type PurchaseInvoiceRow = {
  id: string;
  invoice_date: string;
  total_amount: number;
  payment_status: string;
  supplier_id: string;
};

export default async function PurchasesPage() {
  const supabase = createSupabaseServerClient();

  const [{ data: purchaseInvoices }, { data: suppliers }, catalog] = await Promise.all([
    supabase
      .from("purchase_invoices")
      .select<
        "id, invoice_date, total_amount, payment_status, supplier_id",
        PurchaseInvoiceRow
      >("id, invoice_date, total_amount, payment_status, supplier_id")
      .order("invoice_date", { ascending: false }),
    supabase.from("suppliers").select<"id, name", { id: string; name: string }>("id, name").order("name"),
    getProductCatalog(),
  ]);

  const supplierNameById = new Map((suppliers ?? []).map((s) => [s.id, s.name]));

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">فواتير الشراء</h1>

      <Card>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-right text-foreground/60">
              <th className="py-2">التاريخ</th>
              <th>المورد</th>
              <th>الإجمالي</th>
              <th>حالة الدفع</th>
            </tr>
          </thead>
          <tbody>
            {(purchaseInvoices ?? []).map((inv) => (
              <tr key={inv.id} className="border-b border-border/50">
                <td className="py-2">{new Date(inv.invoice_date).toLocaleDateString("ar-SA")}</td>
                <td>{supplierNameById.get(inv.supplier_id) ?? "—"}</td>
                <td>{formatCurrency(inv.total_amount)}</td>
                <td>
                  {inv.payment_status === "paid" ? "مدفوعة" : inv.payment_status === "partial" ? "جزئي" : "غير مدفوعة"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {(purchaseInvoices?.length ?? 0) === 0 ? (
          <p className="py-4 text-foreground/60">لا توجد فواتير شراء بعد</p>
        ) : null}
      </Card>

      <Card>
        <h2 className="mb-3 font-semibold">فاتورة شراء جديدة</h2>
        {(suppliers?.length ?? 0) === 0 || catalog.length === 0 ? (
          <p className="text-foreground/60">أضف مورد ومنتج واحد على الأقل أولًا</p>
        ) : (
          <PurchaseForm suppliers={suppliers ?? []} catalog={catalog} />
        )}
      </Card>
    </div>
  );
}
