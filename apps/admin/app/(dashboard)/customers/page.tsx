import { Card, Input } from "@system2026/ui";
import { createSupabaseServerClient } from "@system2026/database/server";
import { ActionForm } from "../../../components/action-form";
import { createCustomerAction } from "./actions";

type Customer = {
  id: string;
  name: string;
  shop_name: string | null;
  phone: string | null;
  show_in_store: boolean;
};
type CustomerRepRow = { customer_id: string; rep_id: string };
type Rep = { id: string; name: string };

export default async function CustomersPage() {
  const supabase = createSupabaseServerClient();

  const [{ data: customers }, { data: customerReps }, { data: reps }] = await Promise.all([
    supabase
      .from("customers")
      .select<"id, name, shop_name, phone, show_in_store", Customer>(
        "id, name, shop_name, phone, show_in_store",
      )
      .order("name"),
    supabase
      .from("customer_reps")
      .select<"customer_id, rep_id", CustomerRepRow>("customer_id, rep_id"),
    supabase
      .from("profiles")
      .select<"id, name", Rep>("id, name")
      .eq("role", "rep")
      .eq("is_active", true)
      .order("name"),
  ]);

  const repNameById = new Map((reps ?? []).map((r) => [r.id, r.name]));
  const repsByCustomer = new Map<string, string[]>();
  for (const cr of customerReps ?? []) {
    const list = repsByCustomer.get(cr.customer_id) ?? [];
    list.push(repNameById.get(cr.rep_id) ?? "—");
    repsByCustomer.set(cr.customer_id, list);
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">العملاء</h1>

      <Card>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-right text-foreground/60">
              <th className="py-2">الاسم</th>
              <th>المحل</th>
              <th>الجوال</th>
              <th>المناديب</th>
              <th>بالمتجر</th>
            </tr>
          </thead>
          <tbody>
            {(customers ?? []).map((c) => (
              <tr key={c.id} className="border-b border-border/50">
                <td className="py-2">{c.name}</td>
                <td>{c.shop_name ?? "—"}</td>
                <td>{c.phone ?? "—"}</td>
                <td>{(repsByCustomer.get(c.id) ?? []).join("، ") || "—"}</td>
                <td>{c.show_in_store ? "نعم" : "لا"}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {(customers?.length ?? 0) === 0 ? <p className="py-4 text-foreground/60">لا يوجد عملاء بعد</p> : null}
      </Card>

      <Card className="max-w-md">
        <h2 className="mb-3 font-semibold">إضافة عميل</h2>
        <ActionForm action={createCustomerAction} className="space-y-3">
          <div>
            <label className="mb-1 block text-sm">الاسم</label>
            <Input name="name" required />
          </div>
          <div>
            <label className="mb-1 block text-sm">اسم المحل</label>
            <Input name="shopName" />
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
            <label className="mb-1 block text-sm">رابط جوجل ماب</label>
            <Input name="googleMapsLink" dir="ltr" placeholder="https://maps.google.com/..." />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="showInStore" /> ظاهر بصفحة نقاط البيع العامة
          </label>
          <div>
            <p className="mb-1 text-sm">ربط بمندوب/مناديب</p>
            <div className="flex flex-col gap-1">
              {(reps ?? []).map((r) => (
                <label key={r.id} className="flex items-center gap-2 text-sm">
                  <input type="checkbox" name="repIds" value={r.id} /> {r.name}
                </label>
              ))}
            </div>
          </div>
        </ActionForm>
      </Card>
    </div>
  );
}
