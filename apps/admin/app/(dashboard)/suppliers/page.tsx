import Link from "next/link";
import { Card, Input, ModalTrigger, PageHeader, Breadcrumb, cn } from "@system2026/ui";
import { formatCurrency } from "@system2026/utils";
import { createSupabaseServerClient } from "@system2026/database/server";
import { ActionForm } from "../../../components/action-form";
import { getCurrentUserRole } from "../../../lib/get-current-role";
import { hasPermission } from "../../../lib/permissions";
import { createSupplierAction } from "./actions";

type Supplier = { id: string; name: string; phone: string | null };

const DUES_SORT_OPTIONS: { label: string; key: "name" | "amount" }[] = [
  { label: "الاسم", key: "name" },
  { label: "المستحق", key: "amount" },
];

export default async function SuppliersPage({
  searchParams,
}: {
  searchParams: { duesSort?: string; duesDir?: string };
}) {
  const supabase = createSupabaseServerClient();
  const role = await getCurrentUserRole();

  const [{ data: suppliers }, { data: purchaseInvoices }, { data: payments }] = await Promise.all([
    supabase.from("suppliers").select<"id, name, phone", Supplier>("id, name, phone").order("name"),
    supabase
      .from("purchase_invoices")
      .select<
        "id, supplier_id, total_amount, payment_status",
        { id: string; supplier_id: string; total_amount: number; payment_status: string }
      >("id, supplier_id, total_amount, payment_status"),
    supabase
      .from("supplier_payments")
      .select<
        "supplier_id, purchase_invoice_id, amount",
        { supplier_id: string; purchase_invoice_id: string | null; amount: number }
      >("supplier_id, purchase_invoice_id, amount"),
  ]);

  const totalPurchasedBySupplier = new Map<string, number>();
  for (const inv of purchaseInvoices ?? []) {
    totalPurchasedBySupplier.set(
      inv.supplier_id,
      (totalPurchasedBySupplier.get(inv.supplier_id) ?? 0) + inv.total_amount,
    );
  }
  const totalPaidBySupplier = new Map<string, number>();
  for (const p of payments ?? []) {
    totalPaidBySupplier.set(p.supplier_id, (totalPaidBySupplier.get(p.supplier_id) ?? 0) + p.amount);
  }

  // المستحقات: فقط فواتير الشراء غير المدفوعة/الجزئية، بعد خصم الدفعات
  // المسجّلة على كل فاتورة تحديدًا (وليس إجمالي مدفوعات المورد كلها).
  const paidByInvoice = new Map<string, number>();
  for (const p of payments ?? []) {
    if (!p.purchase_invoice_id) continue;
    paidByInvoice.set(p.purchase_invoice_id, (paidByInvoice.get(p.purchase_invoice_id) ?? 0) + p.amount);
  }
  const owedBySupplier = new Map<string, number>();
  for (const inv of purchaseInvoices ?? []) {
    if (inv.payment_status !== "unpaid" && inv.payment_status !== "partial") continue;
    const remaining = inv.total_amount - (paidByInvoice.get(inv.id) ?? 0);
    if (remaining <= 0) continue;
    owedBySupplier.set(inv.supplier_id, (owedBySupplier.get(inv.supplier_id) ?? 0) + remaining);
  }

  const supplierNameById = new Map((suppliers ?? []).map((s) => [s.id, s.name]));
  const duesSort = searchParams.duesSort === "name" ? "name" : "amount";
  const duesDir = searchParams.duesDir === "asc" ? "asc" : "desc";
  const suppliersWithDebt = Array.from(owedBySupplier.entries()).sort((a, b) => {
    const diff =
      duesSort === "name"
        ? (supplierNameById.get(a[0]) ?? "").localeCompare(supplierNameById.get(b[0]) ?? "", "ar")
        : a[1] - b[1];
    return duesDir === "asc" ? diff : -diff;
  });

  function duesSortHref(key: "name" | "amount") {
    const nextDir = duesSort === key && duesDir === "desc" ? "asc" : "desc";
    return `/suppliers?duesSort=${key}&duesDir=${nextDir}#dues`;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumb={<Breadcrumb items={["لوحة التحكم", "الموردين"]} />}
        title="الموردين"
        subtitle="متابعة الموردين وفواتير الشراء ومستحقاتهم"
        actions={
          hasPermission(role, "manage_purchases") ? (
            <ModalTrigger label="+ إضافة مورد" title="إضافة مورد">
              <ActionForm action={createSupplierAction} className="space-y-3">
                <div>
                  <label className="mb-1 block text-sm">الاسم</label>
                  <Input name="name" required />
                </div>
                <div>
                  <label className="mb-1 block text-sm">الجوال</label>
                  <Input name="phone" dir="ltr" />
                </div>
                <div>
                  <label className="mb-1 block text-sm">العنوان</label>
                  <Input name="address" />
                </div>
                <div>
                  <label className="mb-1 block text-sm">السجل التجاري (اختياري)</label>
                  <Input name="commercialRegistrationNumber" dir="ltr" />
                </div>
                <div>
                  <label className="mb-1 block text-sm">الرقم الضريبي (اختياري)</label>
                  <Input name="vatNumber" dir="ltr" />
                </div>
                <div>
                  <label className="mb-1 block text-sm">ملاحظات</label>
                  <Input name="notes" />
                </div>
              </ActionForm>
            </ModalTrigger>
          ) : null
        }
      />

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-right text-foreground/60">
                <th className="py-2">الاسم</th>
                <th>الجوال</th>
                <th>إجمالي المشتريات</th>
                <th>المسدد</th>
                <th>المستحق</th>
                <th>كشف الحساب</th>
              </tr>
            </thead>
            <tbody>
              {(suppliers ?? []).map((s) => {
                const purchased = totalPurchasedBySupplier.get(s.id) ?? 0;
                const paid = totalPaidBySupplier.get(s.id) ?? 0;
                return (
                  <tr key={s.id} className="border-b border-border/50">
                    <td className="py-2">{s.name}</td>
                    <td>{s.phone ?? "—"}</td>
                    <td>{formatCurrency(purchased)}</td>
                    <td>{formatCurrency(paid)}</td>
                    <td className="font-semibold">{formatCurrency(purchased - paid)}</td>
                    <td>
                      <Link href={`/suppliers/${s.id}`} className="text-primary underline">
                        عرض
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {(suppliers?.length ?? 0) === 0 ? <p className="py-4 text-foreground/60">لا يوجد موردين بعد</p> : null}
      </Card>

      <Card id="dues">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold">المستحقات</h2>
          <div className="flex items-center gap-2">
            <span className="text-sm text-foreground/60">فرز حسب:</span>
            {DUES_SORT_OPTIONS.map((opt) => {
              const isActive = duesSort === opt.key;
              return (
                <Link
                  key={opt.key}
                  href={duesSortHref(opt.key)}
                  className={cn(
                    "inline-flex h-9 items-center justify-center gap-1 rounded-full px-4 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "border border-border bg-background hover:bg-muted",
                  )}
                >
                  {opt.label}
                  {isActive ? (duesDir === "asc" ? "↑" : "↓") : null}
                </Link>
              );
            })}
          </div>
        </div>
        <div className="overflow-x-auto">
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
                  <td className="py-2">
                    <Link href={`/suppliers/${supplierId}`} className="text-primary underline">
                      {supplierNameById.get(supplierId) ?? "—"}
                    </Link>
                  </td>
                  <td className="font-semibold">{formatCurrency(owed)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {suppliersWithDebt.length === 0 ? (
          <p className="py-4 text-foreground/60">لا توجد مستحقات حاليًا</p>
        ) : null}
      </Card>
    </div>
  );
}
