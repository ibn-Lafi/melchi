import { createSupabaseServerClient } from "@system2026/database/server";
import { getRepCatalog } from "../../../lib/get-rep-catalog";
import { AppNav } from "../../../components/nav";
import { InvoiceForm } from "./invoice-form";

export default async function NewInvoicePage({
  searchParams,
}: {
  searchParams: { customerId?: string };
}) {
  const supabase = createSupabaseServerClient();
  const { data: customers } = await supabase
    .from("customers")
    .select<"id, name, shop_name", { id: string; name: string; shop_name: string | null }>(
      "id, name, shop_name",
    )
    .order("name");

  const catalog = await getRepCatalog();

  return (
    <div>
      <AppNav />
      <main className="mx-auto max-w-2xl p-4 pb-28">
        <h1 className="mb-4 text-xl font-bold">فاتورة بيع جديدة</h1>
        {catalog.length === 0 ? (
          <p className="text-foreground/60">لا يوجد رصيد مخزون متاح لديك حاليًا</p>
        ) : (customers?.length ?? 0) === 0 ? (
          <p className="text-foreground/60">لا يوجد عملاء بخط سيرك بعد</p>
        ) : (
          <InvoiceForm
            customers={customers ?? []}
            catalog={catalog}
            defaultCustomerId={searchParams.customerId}
          />
        )}
      </main>
    </div>
  );
}
