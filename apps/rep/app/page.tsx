import Link from "next/link";
import { formatCurrency } from "@system2026/utils";
import { AppNav } from "../components/nav";
import { getRepDashboardStats } from "../lib/get-rep-dashboard";

export default async function HomePage() {
  const stats = await getRepDashboardStats();

  const cards = [
    { label: "إجمالي المبيعات", value: formatCurrency(stats.totalSales) },
    { label: "عدد الفواتير", value: String(stats.invoiceCount) },
    { label: "المبلغ المطلوب", value: formatCurrency(stats.amountDue) },
    { label: "إجمالي المرتجعات", value: formatCurrency(stats.totalReturns) },
  ];

  return (
    <div>
      <AppNav />
      <main className="pb-28">
        <div className="rounded-b-3xl bg-primary px-5 pb-8 pt-10 text-primary-foreground">
          <h1 className="text-2xl font-bold">مرحبًا {stats.repName}</h1>
          <p className="mt-1 text-sm text-primary-foreground/70">نظرة سريعة على أدائك</p>
        </div>

        <div className="-mt-5 px-4">
          <Link
            href="/invoice/new"
            className="flex items-center justify-center rounded-2xl bg-background py-4 text-center font-semibold shadow-pop"
          >
            + إنشاء فاتورة جديدة
          </Link>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 px-4">
          {cards.map((card) => (
            <div key={card.label} className="rounded-2xl border border-border bg-background p-4 shadow-card">
              <p className="text-sm text-muted-foreground">{card.label}</p>
              <p className="mt-3 text-xl font-bold">{card.value}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
