import { Card } from "@system2026/ui";
import { createSupabaseServerClient } from "@system2026/database/server";
import { AppNav } from "../../components/nav";

type InventoryRow = { product_id: string; quantity_available: number };

// مخزون مشترك واحد للنظام كامل (warehouse_stock) — راجع CLAUDE.md. RLS
// (warehouse_stock_select_rep) تسمح لأي مندوب بقراءة الرصيد المشترك (بدون
// تعديل مباشر، كل تغيير كمية يمر عبر RPC فقط).
export default async function InventoryPage() {
  const supabase = createSupabaseServerClient();

  const { data: inventory } = await supabase
    .from("warehouse_stock")
    .select<"product_id, quantity_available", InventoryRow>("product_id, quantity_available")
    .order("quantity_available", { ascending: false });

  const productIds = (inventory ?? []).map((row) => row.product_id);
  const { data: products } =
    productIds.length > 0
      ? await supabase
          .from("products")
          .select<
            "id, name, base_unit_id",
            { id: string; name: string; base_unit_id: string }
          >("id, name, base_unit_id")
          .in("id", productIds)
      : { data: [] };

  const { data: units } = await supabase
    .from("units")
    .select<"id, name", { id: string; name: string }>("id, name");

  const unitNameById = new Map((units ?? []).map((u) => [u.id, u.name]));
  const productById = new Map((products ?? []).map((p) => [p.id, p]));

  return (
    <div>
      <AppNav />
      <main className="mx-auto max-w-2xl p-4 pb-28">
        <h1 className="mb-4 text-xl font-bold">المخزون</h1>
        <Card className="divide-y divide-border p-0">
          {(inventory ?? []).map((row) => {
            const product = productById.get(row.product_id);
            return (
              <div key={row.product_id} className="flex items-center justify-between gap-3 p-4">
                <p className="font-medium">{product?.name ?? "—"}</p>
                <p className="shrink-0 text-sm text-muted-foreground">
                  {row.quantity_available} {product ? unitNameById.get(product.base_unit_id) ?? "" : ""}
                </p>
              </div>
            );
          })}
          {(inventory?.length ?? 0) === 0 ? (
            <p className="py-12 text-center text-muted-foreground">لا يوجد رصيد مخزون متاح حاليًا</p>
          ) : null}
        </Card>
      </main>
    </div>
  );
}
