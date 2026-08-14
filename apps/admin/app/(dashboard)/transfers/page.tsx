import { Card } from "@system2026/ui";
import { createSupabaseServerClient } from "@system2026/database/server";
import { getCurrentUserRole } from "../../../lib/get-current-role";
import { TransferForm } from "./transfer-form";

type TransferRow = { id: string; rep_id: string; transfer_date: string };
type TransferItemRow = { transfer_id: string; product_id: string; quantity: number };

export default async function TransfersPage() {
  const supabase = createSupabaseServerClient();
  const role = await getCurrentUserRole();

  const [{ data: transfers }, { data: transferItems }, { data: reps }, { data: products }] =
    await Promise.all([
      supabase
        .from("stock_transfers")
        .select<"id, rep_id, transfer_date", TransferRow>("id, rep_id, transfer_date")
        .order("transfer_date", { ascending: false })
        .limit(20),
      supabase
        .from("stock_transfer_items")
        .select<"transfer_id, product_id, quantity", TransferItemRow>("transfer_id, product_id, quantity"),
      supabase
        .from("profiles")
        .select<"id, name, role", { id: string; name: string; role: string }>("id, name, role")
        .eq("role", "rep")
        .eq("is_active", true)
        .order("name"),
      supabase.from("products").select<"id, name", { id: string; name: string }>("id, name").order("name"),
    ]);

  const repNameById = new Map((reps ?? []).map((r) => [r.id, r.name]));
  const productNameById = new Map((products ?? []).map((p) => [p.id, p.name]));
  const itemsByTransfer = new Map<string, TransferItemRow[]>();
  for (const item of transferItems ?? []) {
    const list = itemsByTransfer.get(item.transfer_id) ?? [];
    list.push(item);
    itemsByTransfer.set(item.transfer_id, list);
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">نقل البضاعة</h1>

      <Card>
        <h2 className="mb-3 font-semibold">آخر عمليات النقل</h2>
        <div className="space-y-3">
          {(transfers ?? []).map((t) => (
            <div key={t.id} className="border-b border-border/50 pb-2 text-sm">
              <p className="font-medium">
                {repNameById.get(t.rep_id) ?? "—"} — {new Date(t.transfer_date).toLocaleString("ar-SA")}
              </p>
              <ul className="mt-1 list-inside list-disc text-foreground/70">
                {(itemsByTransfer.get(t.id) ?? []).map((item, i) => (
                  <li key={i}>
                    {productNameById.get(item.product_id) ?? "—"}: {item.quantity}
                  </li>
                ))}
              </ul>
            </div>
          ))}
          {(transfers?.length ?? 0) === 0 ? <p className="text-foreground/60">لا توجد عمليات نقل بعد</p> : null}
        </div>
      </Card>

      {role === "admin" ? (
        <Card>
          <h2 className="mb-3 font-semibold">عملية نقل جديدة</h2>
          {(reps?.length ?? 0) === 0 || (products?.length ?? 0) === 0 ? (
            <p className="text-foreground/60">أضف مندوب ومنتج واحد على الأقل أولًا</p>
          ) : (
            <TransferForm reps={reps ?? []} products={products ?? []} />
          )}
        </Card>
      ) : null}
    </div>
  );
}
