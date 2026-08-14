import { Card, PageHeader, Breadcrumb } from "@system2026/ui";
import { formatCurrency } from "@system2026/utils";
import { createSupabaseServerClient } from "@system2026/database/server";
import { InvoiceIcon, WalletIcon, ChartIcon } from "../../components/icons";

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
    { label: "عدد الفواتير اليوم", value: invoiceCount.toString(), icon: InvoiceIcon },
    { label: "مبيعات اليوم", value: formatCurrency(salesTotal), icon: ChartIcon },
    { label: "تحصيلات اليوم", value: formatCurrency(collectionsTotal), icon: WalletIcon },
  ];

  return (
    <div>
      <PageHeader
        breadcrumb={<Breadcrumb items={["لوحة التحكم", "الرئيسية"]} />}
        title="الرئيسية"
        subtitle="نظرة سريعة على أداء اليوم"
      />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {stats.map((stat) => (
          <Card key={stat.label} className="hover:shadow-card-hover">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-muted">
              <stat.icon className="h-[18px] w-[18px]" />
            </div>
            <p className="mt-3 text-sm text-muted-foreground">{stat.label}</p>
            <p className="mt-1 text-2xl font-bold">{stat.value}</p>
          </Card>
        ))}
      </div>
    </div>
  );
}
