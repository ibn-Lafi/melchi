import { Card, ModalTrigger, PageHeader, Breadcrumb } from "@system2026/ui";
import { formatCurrency } from "@system2026/utils";
import { createSupabaseServerClient } from "@system2026/database/server";
import { getProductCatalog } from "../../../lib/get-product-catalog";
import { getCurrentUserRole } from "../../../lib/get-current-role";
import { hasPermission } from "../../../lib/permissions";
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
  const role = await getCurrentUserRole();
  const canManage = hasPermission(role, "manage_purchases");

  const [{ data: purchaseInvoices }, { data: suppliers }, catalog, { data: categories }, { data: units }] =
    await Promise.all([
      supabase
        .from("purchase_invoices")
        .select<
          "id, invoice_date, total_amount, payment_status, supplier_id",
          PurchaseInvoiceRow
        >("id, invoice_date, total_amount, payment_status, supplier_id")
        .order("invoice_date", { ascending: false }),
      supabase.from("suppliers").select<"id, name", { id: string; name: string }>("id, name").order("name"),
      getProductCatalog(),
      supabase.from("categories").select<"id, name", { id: string; name: string }>("id, name").order("name"),
      supabase.from("units").select<"id, name", { id: string; name: string }>("id, name").order("name"),
    ]);

  const supplierNameById = new Map((suppliers ?? []).map((s) => [s.id, s.name]));
  const canCreatePurchase = (suppliers?.length ?? 0) > 0 && (units?.length ?? 0) > 0;

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumb={<Breadcrumb items={["لوحة التحكم", "الموردين", "المشتريات"]} />}
        title="فواتير الشراء"
        subtitle="تسجيل فواتير الشراء من الموردين واحتساب متوسط التكلفة تلقائيًا"
        actions={
          canManage && canCreatePurchase ? (
            <ModalTrigger label="+ فاتورة شراء" title="فاتورة شراء جديدة" size="lg">
              <PurchaseForm
                suppliers={suppliers ?? []}
                catalog={catalog}
                categories={categories ?? []}
                units={units ?? []}
              />
            </ModalTrigger>
          ) : null
        }
      />

      {canManage && !canCreatePurchase ? (
        <p className="text-sm text-foreground/60">أضف مورد ووحدة قياس واحدة على الأقل أولًا لتتمكن من تسجيل فاتورة شراء</p>
      ) : null}

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
    </div>
  );
}
