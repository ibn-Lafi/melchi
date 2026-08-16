import { notFound } from "next/navigation";
import { Card, PageHeader, Breadcrumb } from "@system2026/ui";
import { formatCurrency } from "@system2026/utils";
import { createSupabaseServerClient } from "@system2026/database/server";

type SupplierDetail = { id: string; name: string; phone: string | null; address: string | null; notes: string | null };

type PurchaseInvoiceRow = {
  id: string;
  invoice_date: string;
  total_amount: number;
  payment_status: string;
};

type SupplierPaymentRow = {
  id: string;
  payment_date: string;
  amount: number;
  method: string;
  purchase_invoice_id: string | null;
};

const PAYMENT_STATUS_LABELS: Record<string, string> = {
  paid: "مدفوعة",
  partial: "جزئي",
  unpaid: "غير مدفوعة",
};

const METHOD_LABELS: Record<string, string> = {
  cash: "نقدًا",
  check: "شيك",
  transfer: "تحويل بنكي",
};

export default async function SupplierDetailPage({ params }: { params: { id: string } }) {
  const supabase = createSupabaseServerClient();

  const { data: supplier } = await supabase
    .from("suppliers")
    .select<"id, name, phone, address, notes", SupplierDetail>("id, name, phone, address, notes")
    .eq("id", params.id)
    .single();

  if (!supplier) notFound();

  const [{ data: purchaseInvoices }, { data: payments }] = await Promise.all([
    supabase
      .from("purchase_invoices")
      .select<"id, invoice_date, total_amount, payment_status", PurchaseInvoiceRow>(
        "id, invoice_date, total_amount, payment_status",
      )
      .eq("supplier_id", supplier.id)
      .order("invoice_date", { ascending: false }),
    supabase
      .from("supplier_payments")
      .select<"id, payment_date, amount, method, purchase_invoice_id", SupplierPaymentRow>(
        "id, payment_date, amount, method, purchase_invoice_id",
      )
      .eq("supplier_id", supplier.id)
      .order("payment_date", { ascending: false }),
  ]);

  const paidByInvoice = new Map<string, number>();
  for (const p of payments ?? []) {
    if (!p.purchase_invoice_id) continue;
    paidByInvoice.set(p.purchase_invoice_id, (paidByInvoice.get(p.purchase_invoice_id) ?? 0) + p.amount);
  }

  const totalOwed = (purchaseInvoices ?? [])
    .filter((inv) => inv.payment_status === "unpaid" || inv.payment_status === "partial")
    .reduce((sum, inv) => sum + (inv.total_amount - (paidByInvoice.get(inv.id) ?? 0)), 0);

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumb={<Breadcrumb items={["لوحة التحكم", "الموردين", supplier.name]} />}
        title={supplier.name}
        subtitle="كشف حساب المورد: فواتير الشراء، الدفعات، والمستحق"
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <h2 className="mb-2 font-semibold">بيانات المورد</h2>
          <div className="space-y-1 text-sm">
            <p>
              <span className="text-foreground/60">الجوال: </span>
              {supplier.phone ?? "—"}
            </p>
            <p>
              <span className="text-foreground/60">العنوان: </span>
              {supplier.address ?? "—"}
            </p>
            <p>
              <span className="text-foreground/60">ملاحظات: </span>
              {supplier.notes ?? "—"}
            </p>
          </div>
        </Card>

        <Card>
          <h2 className="mb-2 font-semibold">المستحق للمورد</h2>
          <p className="text-3xl font-bold">{formatCurrency(totalOwed)}</p>
          <p className="mt-1 text-sm text-foreground/60">
            مجموع فواتير الشراء غير المدفوعة/الجزئية بعد خصم الدفعات المسددة
          </p>
        </Card>
      </div>

      <Card>
        <h2 className="mb-3 font-semibold">فواتير الشراء</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-right text-foreground/60">
                <th className="py-2">التاريخ</th>
                <th>الإجمالي</th>
                <th>المتبقي</th>
                <th>حالة الدفع</th>
              </tr>
            </thead>
            <tbody>
              {(purchaseInvoices ?? []).map((inv) => (
                <tr key={inv.id} className="border-b border-border/50">
                  <td className="py-2">{new Date(inv.invoice_date).toLocaleDateString("ar-SA")}</td>
                  <td>{formatCurrency(inv.total_amount)}</td>
                  <td>
                    {inv.payment_status === "unpaid" || inv.payment_status === "partial"
                      ? formatCurrency(inv.total_amount - (paidByInvoice.get(inv.id) ?? 0))
                      : "—"}
                  </td>
                  <td>{PAYMENT_STATUS_LABELS[inv.payment_status] ?? inv.payment_status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {(purchaseInvoices?.length ?? 0) === 0 ? (
          <p className="py-4 text-foreground/60">لا توجد فواتير شراء بعد</p>
        ) : null}
      </Card>

      <Card>
        <h2 className="mb-3 font-semibold">الدفعات المسددة</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-right text-foreground/60">
                <th className="py-2">التاريخ</th>
                <th>المبلغ</th>
                <th>الطريقة</th>
              </tr>
            </thead>
            <tbody>
              {(payments ?? []).map((p) => (
                <tr key={p.id} className="border-b border-border/50">
                  <td className="py-2">{new Date(p.payment_date).toLocaleDateString("ar-SA")}</td>
                  <td>{formatCurrency(p.amount)}</td>
                  <td>{METHOD_LABELS[p.method] ?? p.method}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {(payments?.length ?? 0) === 0 ? <p className="py-4 text-foreground/60">لا توجد دفعات بعد</p> : null}
      </Card>
    </div>
  );
}
