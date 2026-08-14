import { createSupabaseServerClient } from "@system2026/database/server";
import { AppNav } from "../../components/nav";
import { PaymentForm } from "./payment-form";

export default async function CollectionsPage({
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

  const { data: unpaidInvoices } = await supabase
    .from("invoices")
    .select<
      "id, invoice_number, total_amount, status, customer_id",
      { id: string; invoice_number: number; total_amount: number; status: string; customer_id: string }
    >("id, invoice_number, total_amount, status, customer_id")
    .in("status", ["unpaid", "partial"]);

  const invoicesByCustomer: Record<
    string,
    { id: string; invoice_number: number; total_amount: number; status: string }[]
  > = {};
  for (const inv of unpaidInvoices ?? []) {
    invoicesByCustomer[inv.customer_id] ??= [];
    invoicesByCustomer[inv.customer_id]!.push(inv);
  }

  return (
    <div>
      <AppNav />
      <main className="mx-auto max-w-2xl p-4 pb-28">
        <h1 className="mb-4 text-xl font-bold">تسجيل تحصيل</h1>
        {(customers?.length ?? 0) === 0 ? (
          <p className="text-foreground/60">لا يوجد عملاء بخط سيرك بعد</p>
        ) : (
          <PaymentForm
            customers={customers ?? []}
            invoicesByCustomer={invoicesByCustomer}
            defaultCustomerId={searchParams.customerId}
          />
        )}
      </main>
    </div>
  );
}
