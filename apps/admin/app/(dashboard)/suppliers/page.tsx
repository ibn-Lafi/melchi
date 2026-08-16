import Link from "next/link";
import { Card, Input, LinkButton, ModalTrigger, PageHeader, Breadcrumb } from "@system2026/ui";
import { formatCurrency } from "@system2026/utils";
import { createSupabaseServerClient } from "@system2026/database/server";
import { ActionForm } from "../../../components/action-form";
import { getCurrentUserRole } from "../../../lib/get-current-role";
import { hasPermission } from "../../../lib/permissions";
import { createSupplierAction } from "./actions";

type Supplier = { id: string; name: string; phone: string | null };

export default async function SuppliersPage() {
  const supabase = createSupabaseServerClient();
  const role = await getCurrentUserRole();

  const [{ data: suppliers }, { data: purchaseInvoices }, { data: payments }] = await Promise.all([
    supabase.from("suppliers").select<"id, name, phone", Supplier>("id, name, phone").order("name"),
    supabase
      .from("purchase_invoices")
      .select<
        "supplier_id, total_amount",
        { supplier_id: string; total_amount: number }
      >("supplier_id, total_amount"),
    supabase
      .from("supplier_payments")
      .select<"supplier_id, amount", { supplier_id: string; amount: number }>("supplier_id, amount"),
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

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumb={<Breadcrumb items={["لوحة التحكم", "الموردين"]} />}
        title="الموردين"
        subtitle="متابعة الموردين وفواتير الشراء ومستحقاتهم"
        actions={
          <>
            <LinkButton href="/purchases">فواتير الشراء</LinkButton>
            <LinkButton href="/payables">مستحقات الموردين</LinkButton>
            {hasPermission(role, "manage_purchases") ? (
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
            ) : null}
          </>
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
    </div>
  );
}
