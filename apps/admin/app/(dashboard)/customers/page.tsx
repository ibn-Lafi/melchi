import Link from "next/link";
import { Card, Input, ModalTrigger, PageHeader, Breadcrumb } from "@system2026/ui";
import { createSupabaseServerClient } from "@system2026/database/server";
import { ActionForm } from "../../../components/action-form";
import { getCurrentUserRole } from "../../../lib/get-current-role";
import { hasPermission } from "../../../lib/permissions";
import { createCustomerAction, updateCustomerAction, createCityAction } from "./actions";

type Customer = {
  id: string;
  name: string;
  shop_name: string | null;
  phone: string | null;
  address: string | null;
  notes: string | null;
  google_maps_link: string | null;
  show_in_store: boolean;
  city_id: string | null;
};
type CustomerRepRow = { customer_id: string; rep_id: string };
type Rep = { id: string; name: string };
type City = { id: string; name: string };

const SELECT_CLASS = "h-11 w-full rounded-xl border border-border bg-background px-4 text-sm";

function CitySelect({ cities, defaultValue }: { cities: City[]; defaultValue?: string | null }) {
  return (
    <select name="cityId" defaultValue={defaultValue ?? ""} className={SELECT_CLASS}>
      <option value="">بدون مدينة</option>
      {cities.map((city) => (
        <option key={city.id} value={city.id}>
          {city.name}
        </option>
      ))}
    </select>
  );
}

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: { cityId?: string };
}) {
  const supabase = createSupabaseServerClient();
  const role = await getCurrentUserRole();
  const canManage = hasPermission(role, "manage_customers");

  let customersQuery = supabase
    .from("customers")
    .select<
      "id, name, shop_name, phone, address, notes, google_maps_link, show_in_store, city_id",
      Customer
    >("id, name, shop_name, phone, address, notes, google_maps_link, show_in_store, city_id")
    .order("name");
  if (searchParams.cityId) customersQuery = customersQuery.eq("city_id", searchParams.cityId);

  const [{ data: customers }, { data: customerReps }, { data: reps }, { data: cities }] =
    await Promise.all([
      customersQuery,
      supabase
        .from("customer_reps")
        .select<"customer_id, rep_id", CustomerRepRow>("customer_id, rep_id"),
      supabase
        .from("profiles")
        .select<"id, name", Rep>("id, name")
        .eq("role", "rep")
        .eq("is_active", true)
        .order("name"),
      supabase.from("cities").select<"id, name", City>("id, name").order("name"),
    ]);

  const repNameById = new Map((reps ?? []).map((r) => [r.id, r.name]));
  const cityNameById = new Map((cities ?? []).map((c) => [c.id, c.name]));
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
            <>
              <ModalTrigger label="+ مدينة" title="إضافة مدينة" variant="outline">
                <ActionForm action={createCityAction} className="space-y-3">
                  <Input name="name" placeholder="اسم المدينة" required />
                </ActionForm>
              </ModalTrigger>
              <ModalTrigger label="+ إضافة عميل" title="إضافة عميل">
                <ActionForm action={createCustomerAction} className="space-y-3">
                  <div>
                    <label className="mb-1 block text-sm">اسم السجل</label>
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
                    <label className="mb-1 block text-sm">المدينة</label>
                    <CitySelect cities={cities ?? []} />
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
            </>
          ) : null
        }
      />

      <Card>
        <form className="mb-4 flex flex-wrap items-end gap-3 text-sm">
          <div>
            <label className="mb-1 block text-xs text-foreground/60">فلترة حسب المدينة</label>
            <select
              name="cityId"
              defaultValue={searchParams.cityId ?? ""}
              className="h-10 rounded-md border border-border bg-background px-3"
            >
              <option value="">كل المدن</option>
              {(cities ?? []).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <button type="submit" className="h-10 rounded-md border border-border px-3">
            فلترة
          </button>
        </form>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-right text-foreground/60">
                <th className="py-2">اسم السجل</th>
                <th>المحل</th>
                <th>المدينة</th>
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
                  <td>{c.city_id ? cityNameById.get(c.city_id) ?? "—" : "—"}</td>
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
                            <label className="mb-1 block text-sm">اسم السجل</label>
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
                            <label className="mb-1 block text-sm">المدينة</label>
                            <CitySelect cities={cities ?? []} defaultValue={c.city_id} />
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
