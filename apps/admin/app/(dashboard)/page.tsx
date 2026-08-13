import { Card } from "@system2026/ui";
import { formatCurrency } from "@system2026/utils";
import { createSupabaseServerClient } from "@system2026/database/server";

export default async function DashboardHomePage() {
  const supabase = createSupabaseServerClient();
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const { data: todayInvoices } = await supabase
    .from("invoices")
    .select<"total_amount, status", { total_amount: number; status: string }>("total_amount, status")
    .gte("invoice_date", todayStart.toISOString())
    .neq("status", "cancelled");

  const { data: todayPayments } = await supabase
    .from("payments")
    .select<"amount", { amount: number }>("amount")
    .gte("payment_date", todayStart.toISOString());

  const invoiceCount = todayInvoices?.length ?? 0;
  const salesTotal = todayInvoices?.reduce((sum, inv) => sum + inv.total_amount, 0) ?? 0;
  const collectionsTotal = todayPayments?.reduce((sum, p) => sum + p.amount, 0) ?? 0;

  const stats = [
    { label: "عدد الفواتير اليوم", value: invoiceCount.toString() },
    { label: "مبيعات اليوم", value: formatCurrency(salesTotal) },
    { label: "تحصيلات اليوم", value: formatCurrency(collectionsTotal) },
  ];

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">الرئيسية</h1>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <p className="text-sm text-foreground/60">{stat.label}</p>
            <p className="mt-2 text-2xl font-bold">{stat.value}</p>
          </Card>
        ))}
      </div>
    </div>
  );
}
