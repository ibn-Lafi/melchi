import { Card, Input } from "@system2026/ui";
import { formatCurrency } from "@system2026/utils";
import { createSupabaseServerClient } from "@system2026/database/server";
import { ActionForm } from "../../../components/action-form";
import { createSupplierAction } from "./actions";

type Supplier = { id: string; name: string; phone: string | null };

export default async function SuppliersPage() {
  const supabase = createSupabaseServerClient();

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
      <h1 className="text-2xl font-bold">الموردين</h1>

      <Card>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-right text-foreground/60">
              <th className="py-2">الاسم</th>
              <th>الجوال</th>
              <th>إجمالي المشتريات</th>
              <th>المسدد</th>
              <th>المستحق</th>
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
                </tr>
              );
            })}
          </tbody>
        </table>
        {(suppliers?.length ?? 0) === 0 ? <p className="py-4 text-foreground/60">لا يوجد موردين بعد</p> : null}
      </Card>

      <Card className="max-w-md">
        <h2 className="mb-3 font-semibold">إضافة مورد</h2>
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
            <label className="mb-1 block text-sm">ملاحظات</label>
            <Input name="notes" />
          </div>
        </ActionForm>
      </Card>
    </div>
  );
}
