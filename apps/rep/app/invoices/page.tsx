import Link from "next/link";
import { Card } from "@system2026/ui";
import { formatCurrency } from "@system2026/utils";
import { createSupabaseServerClient } from "@system2026/database/server";
import { AppNav } from "../../components/nav";

type InvoiceRow = {
  id: string;
  invoice_number: number;
  invoice_date: string;
  total_amount: number;
  status: string;
  customer_id: string;
};

const STATUS_LABELS: Record<string, string> = {
  paid: "مدفوعة",
  partial: "جزئي",
  unpaid: "غير مدفوعة",
  cancelled: "ملغاة",
};

// RLS (invoices_select_own_rep) يقيّد النتيجة تلقائيًا لفواتير المندوب
// الحالي فقط.
export default async function InvoicesPage() {
  const supabase = createSupabaseServerClient();

  const { data: invoices } = await supabase
    .from("invoices")
    .select<
      "id, invoice_number, invoice_date, total_amount, status, customer_id",
      InvoiceRow
    >("id, invoice_number, invoice_date, total_amount, status, customer_id")
    .order("invoice_date", { ascending: false });

  const customerIds = [...new Set((invoices ?? []).map((inv) => inv.customer_id))];
  const { data: customers } =
    customerIds.length > 0
      ? await supabase
          .from("customers")
          .select<"id, name, shop_name", { id: string; name: string; shop_name: string | null }>(
            "id, name, shop_name",
          )
          .in("id", customerIds)
      : { data: [] };

  const customerNameById = new Map((customers ?? []).map((c) => [c.id, c.shop_name ?? c.name]));

  return (
    <div>
      <AppNav />
      <main className="mx-auto max-w-2xl p-4 pb-28">
        <h1 className="mb-4 text-xl font-bold">الفواتير</h1>
        <div className="grid gap-2">
          {(invoices ?? []).map((invoice) => (
            <Link key={invoice.id} href={`/invoice/${invoice.id}`}>
              <Card className="flex items-center justify-between">
                <div>
                  <p className="font-semibold">فاتورة #{invoice.invoice_number}</p>
                  <p className="text-sm text-muted-foreground">
                    {customerNameById.get(invoice.customer_id) ?? "—"} ·{" "}
                    {new Date(invoice.invoice_date).toLocaleDateString("ar-SA")}
                  </p>
                </div>
                <div className="text-left">
                  <p className="font-bold">{formatCurrency(invoice.total_amount)}</p>
                  <span className="text-xs text-muted-foreground">
                    {STATUS_LABELS[invoice.status] ?? invoice.status}
                  </span>
                </div>
              </Card>
            </Link>
          ))}
          {(invoices?.length ?? 0) === 0 ? (
            <p className="py-12 text-center text-muted-foreground">لا توجد فواتير بعد</p>
          ) : null}
        </div>
      </main>
    </div>
  );
}
