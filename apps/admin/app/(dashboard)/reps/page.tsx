import { Badge, Card, Input, PageHeader, Breadcrumb } from "@system2026/ui";
import { formatCurrency } from "@system2026/utils";
import { createSupabaseServerClient } from "@system2026/database/server";
import { ActionForm } from "../../../components/action-form";
import { getProfitSummary } from "../../../lib/get-profitability";
import { getCurrentUserRole } from "../../../lib/get-current-role";
import { createRepAction } from "./actions";

type Rep = { id: string; name: string; email: string | null; phone: string | null; is_active: boolean };
type InventoryRow = { rep_id: string; product_id: string; quantity_available: number };

export default async function RepsPage() {
  const supabase = createSupabaseServerClient();
  const role = await getCurrentUserRole();

  const [{ data: reps }, { data: inventory }, profitSummary] = await Promise.all([
    supabase
      .from("profiles")
      .select<"id, name, email, phone, is_active", Rep>("id, name, email, phone, is_active")
      .eq("role", "rep")
      .order("name"),
    supabase
      .from("rep_inventory")
      .select<"rep_id, product_id, quantity_available", InventoryRow>(
        "rep_id, product_id, quantity_available",
      ),
    getProfitSummary(),
  ]);

  const inventoryCountByRep = new Map<string, number>();
  for (const row of inventory ?? []) {
    inventoryCountByRep.set(row.rep_id, (inventoryCountByRep.get(row.rep_id) ?? 0) + row.quantity_available);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumb={<Breadcrumb items={["لوحة التحكم", "المناديب"]} />}
        title="المناديب"
        subtitle="إدارة حسابات المناديب ومتابعة أدائهم ورصيد مخزونهم"
      />

      <Card>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-right text-foreground/60">
              <th className="py-2">الاسم</th>
              <th>البريد الإلكتروني</th>
              <th>الجوال</th>
              <th>إجمالي رصيد المخزون</th>
              <th>إجمالي المبيعات</th>
              <th>إجمالي الربح</th>
              <th>الحالة</th>
            </tr>
          </thead>
          <tbody>
            {(reps ?? []).map((rep) => {
              const stats = profitSummary.byRep.get(rep.id);
              return (
                <tr key={rep.id} className="border-b border-border/50">
                  <td className="py-2">{rep.name}</td>
                  <td dir="ltr">{rep.email ?? "—"}</td>
                  <td>{rep.phone ?? "—"}</td>
                  <td>{inventoryCountByRep.get(rep.id) ?? 0}</td>
                  <td>{formatCurrency(stats?.sales ?? 0)}</td>
                  <td>{formatCurrency(stats?.profit ?? 0)}</td>
                  <td>
                    <Badge variant={rep.is_active ? "success" : "muted"}>
                      {rep.is_active ? "نشط" : "موقوف"}
                    </Badge>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {(reps?.length ?? 0) === 0 ? <p className="py-4 text-foreground/60">لا يوجد مناديب بعد</p> : null}
      </Card>

      {role === "admin" ? (
        <Card className="max-w-md">
          <h2 className="mb-3 font-semibold">إضافة مندوب</h2>
          <ActionForm action={createRepAction} className="space-y-3">
            <div>
              <label className="mb-1 block text-sm">الاسم</label>
              <Input name="name" required />
            </div>
            <div>
              <label className="mb-1 block text-sm">البريد الإلكتروني (لتسجيل الدخول)</label>
              <Input name="email" type="email" dir="ltr" required />
            </div>
            <div>
              <label className="mb-1 block text-sm">رقم الجوال (اختياري)</label>
              <Input name="phone" dir="ltr" />
            </div>
            <div>
              <label className="mb-1 block text-sm">كلمة المرور</label>
              <Input name="password" type="password" required minLength={6} />
            </div>
          </ActionForm>
        </Card>
      ) : null}
    </div>
  );
}
