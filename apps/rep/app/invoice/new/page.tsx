import { createSupabaseServerClient } from "@system2026/database/server";
import { getRepCatalog } from "../../../lib/get-rep-catalog";
import { SheetCloseButton } from "../../../components/sheet-close-button";
import { InvoiceForm } from "./invoice-form";

export default async function NewInvoicePage({
  searchParams,
}: {
  searchParams: { customerId?: string };
}) {
  const supabase = createSupabaseServerClient();
  const [{ data: customers }, { data: branches }] = await Promise.all([
    supabase
      .from("customers")
      .select<"id, name, shop_name", { id: string; name: string; shop_name: string | null }>(
        "id, name, shop_name",
      )
      .order("name"),
    supabase
      .from("customer_branches")
      .select<"id, customer_id, name", { id: string; customer_id: string; name: string }>(
        "id, customer_id, name",
      )
      .order("name"),
  ]);

  const branchesByCustomer = new Map<string, { id: string; name: string }[]>();
  for (const b of branches ?? []) {
    const list = branchesByCustomer.get(b.customer_id) ?? [];
    list.push({ id: b.id, name: b.name });
    branchesByCustomer.set(b.customer_id, list);
  }

  const customersWithBranches = (customers ?? []).map((c) => ({
    ...c,
    branches: branchesByCustomer.get(c.id) ?? [],
  }));

  const catalog = await getRepCatalog();

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-foreground/30 sm:items-center">
      <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-t-3xl bg-background p-4 pb-8 shadow-pop sm:rounded-3xl">
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-xl font-bold">فاتورة بيع جديدة</h1>
          <SheetCloseButton />
        </div>
        {catalog.length === 0 ? (
          <p className="text-foreground/60">لا يوجد رصيد مخزون متاح حاليًا</p>
        ) : customersWithBranches.length === 0 ? (
          <p className="text-foreground/60">لا يوجد عملاء بخط سيرك بعد</p>
        ) : (
          <InvoiceForm
            customers={customersWithBranches}
            catalog={catalog}
            defaultCustomerId={searchParams.customerId}
          />
        )}
      </div>
    </div>
  );
}
