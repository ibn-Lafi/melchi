import { Card, Input } from "@system2026/ui";
import { formatCurrency } from "@system2026/utils";
import { createSupabaseServerClient } from "@system2026/database/server";
import { ActionForm } from "../../../components/action-form";
import { getCurrentUserRole } from "../../../lib/get-current-role";
import { createCategoryAction, createProductAction, createUnitAction } from "./actions";

type ProductRow = {
  id: string;
  name: string;
  price: number;
  average_cost: number;
  visible_in_store: boolean;
  category_id: string | null;
  base_unit_id: string;
};
type CategoryRow = { id: string; name: string };
type UnitRow = { id: string; name: string };

export default async function ProductsPage() {
  const supabase = createSupabaseServerClient();
  const role = await getCurrentUserRole();
  const canManage = role === "admin";

  const [{ data: products }, { data: categories }, { data: units }] = await Promise.all([
    supabase
      .from("products")
      .select<
        "id, name, price, average_cost, visible_in_store, category_id, base_unit_id",
        ProductRow
      >("id, name, price, average_cost, visible_in_store, category_id, base_unit_id")
      .order("name"),
    supabase.from("categories").select<"id, name", CategoryRow>("id, name").order("name"),
    supabase.from("units").select<"id, name", UnitRow>("id, name").order("name"),
  ]);

  const categoryNameById = new Map((categories ?? []).map((c) => [c.id, c.name]));
  const unitNameById = new Map((units ?? []).map((u) => [u.id, u.name]));

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">المنتجات</h1>

      <Card>
        <h2 className="mb-3 font-semibold">قائمة المنتجات</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-right text-foreground/60">
                <th className="py-2">الاسم</th>
                <th>الفئة</th>
                <th>سعر البيع</th>
                <th>متوسط التكلفة</th>
                <th>الوحدة الأساسية</th>
                <th>بالمتجر</th>
              </tr>
            </thead>
            <tbody>
              {(products ?? []).map((p) => (
                <tr key={p.id} className="border-b border-border/50">
                  <td className="py-2">{p.name}</td>
                  <td>{p.category_id ? categoryNameById.get(p.category_id) : "—"}</td>
                  <td>{formatCurrency(p.price)}</td>
                  <td>{formatCurrency(p.average_cost)}</td>
                  <td>{unitNameById.get(p.base_unit_id) ?? "—"}</td>
                  <td>{p.visible_in_store ? "نعم" : "لا"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {(products?.length ?? 0) === 0 ? (
            <p className="py-4 text-foreground/60">لا توجد منتجات بعد</p>
          ) : null}
        </div>
      </Card>

      {canManage ? (
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <h2 className="mb-3 font-semibold">إضافة منتج</h2>
            <ActionForm action={createProductAction} className="space-y-3">
              <div>
                <label className="mb-1 block text-sm">الاسم</label>
                <Input name="name" required />
              </div>
              <div>
                <label className="mb-1 block text-sm">الوصف</label>
                <Input name="description" />
              </div>
              <div>
                <label className="mb-1 block text-sm">سعر البيع</label>
                <Input name="price" type="number" step="0.01" min="0" required />
              </div>
              <div>
                <label className="mb-1 block text-sm">الفئة</label>
                <select name="categoryId" className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm">
                  <option value="">بدون فئة</option>
                  {(categories ?? []).map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm">الوحدة الأساسية</label>
                <select name="baseUnitId" required className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm">
                  <option value="">اختر وحدة</option>
                  {(units ?? []).map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name}
                    </option>
                  ))}
                </select>
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="visibleInStore" defaultChecked /> ظاهر بالمتجر
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="hasExpiry" /> له تاريخ صلاحية
              </label>
              <div>
                <label className="mb-1 block text-sm">تاريخ الصلاحية (إن وُجد)</label>
                <Input name="expiryDate" type="date" />
              </div>
            </ActionForm>
          </Card>

          <div className="space-y-4">
            <Card>
              <h2 className="mb-3 font-semibold">إضافة فئة</h2>
              <ActionForm action={createCategoryAction} className="space-y-3">
                <Input name="name" placeholder="اسم الفئة" required />
              </ActionForm>
            </Card>
            <Card>
              <h2 className="mb-3 font-semibold">إضافة وحدة قياس</h2>
              <ActionForm action={createUnitAction} className="space-y-3">
                <Input name="name" placeholder="مثال: كرتون" required />
              </ActionForm>
            </Card>
          </div>
        </div>
      ) : null}
    </div>
  );
}
