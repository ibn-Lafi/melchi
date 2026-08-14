import { Card, BarList, PageHeader, Breadcrumb } from "@system2026/ui";
import { formatCurrency } from "@system2026/utils";
import { createSupabaseServerClient } from "@system2026/database/server";
import { getProfitSummary } from "../../../lib/get-profitability";

type ProductRow = { id: string; name: string; average_cost: number; has_expiry: boolean; expiry_date: string | null };
type WriteOffMovement = { product_id: string; quantity_change: number };
type RepRow = { id: string; name: string };
type SettingsRow = { expiry_alert_days_threshold: number };

export default async function ReportsPage() {
  const supabase = createSupabaseServerClient();

  const [profitSummary, { data: products }, { data: writeOffs }, { data: reps }, { data: settings }] =
    await Promise.all([
      getProfitSummary(),
      supabase
        .from("products")
        .select<
          "id, name, average_cost, has_expiry, expiry_date",
          ProductRow
        >("id, name, average_cost, has_expiry, expiry_date"),
      supabase
        .from("stock_movements")
        .select<"product_id, quantity_change", WriteOffMovement>("product_id, quantity_change")
        .eq("movement_type", "write_off"),
      supabase.from("profiles").select<"id, name", RepRow>("id, name").eq("role", "rep"),
      supabase
        .from("system_settings")
        .select<"expiry_alert_days_threshold", SettingsRow>("expiry_alert_days_threshold")
        .eq("id", 1)
        .single(),
    ]);

  const productNameById = new Map((products ?? []).map((p) => [p.id, p.name]));
  const productCostById = new Map((products ?? []).map((p) => [p.id, p.average_cost]));
  const repNameById = new Map((reps ?? []).map((r) => [r.id, r.name]));

  const topProducts = Array.from(profitSummary.byProduct.entries())
    .sort((a, b) => b[1].profit - a[1].profit)
    .slice(0, 10);

  const topReps = Array.from(profitSummary.byRep.entries()).sort((a, b) => b[1].profit - a[1].profit);

  let totalLossValue = 0;
  const lossByProduct = new Map<string, number>();
  for (const movement of writeOffs ?? []) {
    const quantity = Math.abs(movement.quantity_change);
    const cost = productCostById.get(movement.product_id) ?? 0;
    const value = quantity * cost;
    totalLossValue += value;
    lossByProduct.set(movement.product_id, (lossByProduct.get(movement.product_id) ?? 0) + value);
  }

  const thresholdDays = settings?.expiry_alert_days_threshold ?? 30;
  const thresholdDate = new Date();
  thresholdDate.setDate(thresholdDate.getDate() + thresholdDays);
  const expiringProducts = (products ?? []).filter(
    (p) => p.has_expiry && p.expiry_date && new Date(p.expiry_date) <= thresholdDate,
  );

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumb={<Breadcrumb items={["لوحة التحكم", "التقارير"]} />}
        title="التقارير"
        subtitle="أداء المبيعات والربحية والخسائر"
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <p className="text-sm text-foreground/60">إجمالي المبيعات (كل الفترات)</p>
          <p className="mt-2 text-2xl font-bold">{formatCurrency(profitSummary.totalSales)}</p>
        </Card>
        <Card>
          <p className="text-sm text-foreground/60">إجمالي الربح الصافي (كل الفترات)</p>
          <p className="mt-2 text-2xl font-bold">{formatCurrency(profitSummary.totalProfit)}</p>
        </Card>
      </div>

      <Card>
        <h2 className="mb-4 font-semibold">أفضل المنتجات ربحًا</h2>
        {topProducts.length > 0 ? (
          <BarList
            items={topProducts.map(([productId, stats]) => ({
              label: productNameById.get(productId) ?? "—",
              value: stats.profit,
              displayValue: formatCurrency(stats.profit),
            }))}
          />
        ) : null}
      </Card>

      <Card>
        <h2 className="mb-3 font-semibold">تفاصيل أفضل المنتجات ربحًا</h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-right text-foreground/60">
              <th className="py-2">المنتج</th>
              <th>الكمية المباعة</th>
              <th>المبيعات</th>
              <th>الربح</th>
              <th>هامش الربح</th>
            </tr>
          </thead>
          <tbody>
            {topProducts.map(([productId, stats]) => (
              <tr key={productId} className="border-b border-border/50">
                <td className="py-2">{productNameById.get(productId) ?? "—"}</td>
                <td>{stats.quantity}</td>
                <td>{formatCurrency(stats.sales)}</td>
                <td>{formatCurrency(stats.profit)}</td>
                <td>{stats.sales > 0 ? `${((stats.profit / stats.sales) * 100).toFixed(1)}%` : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {topProducts.length === 0 ? <p className="py-4 text-foreground/60">لا توجد بيانات بعد</p> : null}
      </Card>

      <Card>
        <h2 className="mb-4 font-semibold">الربح حسب المندوب</h2>
        {topReps.length > 0 ? (
          <BarList
            items={topReps.map(([repId, stats]) => ({
              label: repNameById.get(repId) ?? "—",
              value: stats.profit,
              displayValue: formatCurrency(stats.profit),
            }))}
          />
        ) : null}
      </Card>

      <Card>
        <h2 className="mb-3 font-semibold">تفاصيل الربح حسب المندوب</h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-right text-foreground/60">
              <th className="py-2">المندوب</th>
              <th>المبيعات</th>
              <th>الربح</th>
            </tr>
          </thead>
          <tbody>
            {topReps.map(([repId, stats]) => (
              <tr key={repId} className="border-b border-border/50">
                <td className="py-2">{repNameById.get(repId) ?? "—"}</td>
                <td>{formatCurrency(stats.sales)}</td>
                <td>{formatCurrency(stats.profit)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {topReps.length === 0 ? <p className="py-4 text-foreground/60">لا توجد بيانات بعد</p> : null}
      </Card>

      <Card>
        <h2 className="mb-3 font-semibold">تقرير الخسائر (تالف/منتهي الصلاحية)</h2>
        <p className="mb-2 text-sm text-foreground/60">
          إجمالي قيمة الخسائر بسعر التكلفة: <span className="font-bold">{formatCurrency(totalLossValue)}</span>
        </p>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-right text-foreground/60">
              <th className="py-2">المنتج</th>
              <th>قيمة الخسارة</th>
            </tr>
          </thead>
          <tbody>
            {Array.from(lossByProduct.entries()).map(([productId, value]) => (
              <tr key={productId} className="border-b border-border/50">
                <td className="py-2">{productNameById.get(productId) ?? "—"}</td>
                <td>{formatCurrency(value)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {lossByProduct.size === 0 ? <p className="py-4 text-foreground/60">لا توجد خسائر مسجّلة</p> : null}
      </Card>

      <Card>
        <h2 className="mb-3 font-semibold">تقرير قرب انتهاء الصلاحية (خلال {thresholdDays} يوم)</h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-right text-foreground/60">
              <th className="py-2">المنتج</th>
              <th>تاريخ الانتهاء</th>
            </tr>
          </thead>
          <tbody>
            {expiringProducts.map((p) => (
              <tr key={p.id} className="border-b border-border/50">
                <td className="py-2">{p.name}</td>
                <td>{p.expiry_date}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {expiringProducts.length === 0 ? (
          <p className="py-4 text-foreground/60">لا توجد منتجات قريبة من الانتهاء</p>
        ) : null}
      </Card>
    </div>
  );
}
