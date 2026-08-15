import Link from "next/link";
import { Card, Input, ModalTrigger, PageHeader, Breadcrumb } from "@system2026/ui";
import { createSupabaseServerClient } from "@system2026/database/server";
import { ActionForm } from "../../../components/action-form";
import { getCurrentUserRole } from "../../../lib/get-current-role";
import { hasPermission } from "../../../lib/permissions";
import { createCustomerAction, updateCustomerAction } from "./actions";

type Customer = {
  id: string;
  name: string;
  shop_name: string | null;
  phone: string | null;
  address: string | null;
  notes: string | null;
  google_maps_link: string | null;
  show_in_store: boolean;
};
type CustomerRepRow = { customer_id: string; rep_id: string };
type Rep = { id: string; name: string };

export default async function CustomersPage() {
  const supabase = createSupabaseServerClient();
  const role = await getCurrentUserRole();
  const canManage = hasPermission(role, "manage_customers");

  const [{ data: customers }, { data: customerReps }, { data: reps }] = await Promise.all([
    supabase
      .from("customers")
      .select<
        "id, name, shop_name, phone, address, notes, google_maps_link, show_in_store",
        Customer
      >("id, name, shop_name, phone, address, notes, google_maps_link, show_in_store")
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
  const repIdsByCustomer = new Map<string, string[]>();
  const repsByCustomer = new Map<string, string[]>();
  for (const cr of customerReps ?? []) {
    repIdsByCustomer.set(cr.customer_id, [...(repIdsByCustomer.get(cr.customer_id) ?? []), cr.rep_id]);
    const list = repsByCustomer.get(cr.customer_id) ?? [];
    list.push(repNameById.get(cr.rep_id) ?? "—");
    repsByCustomer.set(cr.customer_id, list);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumb={<Breadcrumb items={["لوحة التحكم", "العملاء"]} />}
        title="العملاء"
        subtitle="إدارة العملاء وربطهم بالمناديب"
        actions={
          canManage ? (
            <ModalTrigger label="+ إضافة عميل" title="إضافة عميل">
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
                  <label className="mb-1 block text-sm">ملاحظات</label>
                  <Input name="notes" />
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
                <th>المحل</th>
                <th>الجوال</th>
                <th>المناديب</th>
                <th>بالمتجر</th>
                <th>الموقع</th>
                <th>كشف الحساب</th>
                {canManage ? <th></th> : null}
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
                  <td>
                    {c.google_maps_link ? (
                      <a
                        href={c.google_maps_link}
                        target="_blank"
                        rel="noreferrer"
                        className="text-primary underline"
                      >
                        فتح الموقع 📍
                      </a>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td>
                    <Link href={`/customers/${c.id}`} className="text-primary underline">
                      عرض
                    </Link>
                  </td>
                  {canManage ? (
                    <td>
                      <ModalTrigger label="تعديل" title={`تعديل: ${c.name}`} variant="outline">
                        <ActionForm action={updateCustomerAction} className="space-y-3">
                          <input type="hidden" name="id" value={c.id} />
                          <div>
                            <label className="mb-1 block text-sm">الاسم</label>
                            <Input name="name" defaultValue={c.name} required />
                          </div>
                          <div>
                            <label className="mb-1 block text-sm">اسم المحل</label>
                            <Input name="shopName" defaultValue={c.shop_name ?? ""} />
                          </div>
                          <div>
                            <label className="mb-1 block text-sm">الجوال</label>
                            <Input name="phone" dir="ltr" defaultValue={c.phone ?? ""} />
                          </div>
                          <div>
                            <label className="mb-1 block text-sm">العنوان</label>
                            <Input name="address" defaultValue={c.address ?? ""} />
                          </div>
                          <div>
                            <label className="mb-1 block text-sm">ملاحظات</label>
                            <Input name="notes" defaultValue={c.notes ?? ""} />
                          </div>
                          <div>
                            <label className="mb-1 block text-sm">رابط جوجل ماب</label>
                            <Input
                              name="googleMapsLink"
                              dir="ltr"
                              defaultValue={c.google_maps_link ?? ""}
                              placeholder="https://maps.google.com/..."
                            />
                          </div>
                          <label className="flex items-center gap-2 text-sm">
                            <input
                              type="checkbox"
                              name="showInStore"
                              defaultChecked={c.show_in_store}
                            />{" "}
                            ظاهر بصفحة نقاط البيع العامة
                          </label>
                          <div>
                            <p className="mb-1 text-sm">ربط بمندوب/مناديب</p>
                            <div className="flex flex-col gap-1">
                              {(reps ?? []).map((r) => (
                                <label key={r.id} className="flex items-center gap-2 text-sm">
                                  <input
                                    type="checkbox"
                                    name="repIds"
                                    value={r.id}
                                    defaultChecked={(repIdsByCustomer.get(c.id) ?? []).includes(r.id)}
                                  />{" "}
                                  {r.name}
                                </label>
                              ))}
                            </div>
                          </div>
                        </ActionForm>
                      </ModalTrigger>
                    </td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {(customers?.length ?? 0) === 0 ? <p className="py-4 text-foreground/60">لا يوجد عملاء بعد</p> : null}
      </Card>
    </div>
  );
}
