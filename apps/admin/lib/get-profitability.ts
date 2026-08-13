import { createSupabaseServerClient } from "@system2026/database/server";

type InvoiceRow = { id: string; rep_id: string; status: string };
type InvoiceItemRow = {
  invoice_id: string;
  product_id: string;
  quantity_in_base_unit: number;
  unit_price: number;
  cost_price: number;
};

export type ProfitSummary = {
  byRep: Map<string, { sales: number; profit: number }>;
  byProduct: Map<string, { sales: number; profit: number; quantity: number }>;
  totalSales: number;
  totalProfit: number;
};

// الربح لكل بند = (سعر البيع - سعر التكلفة المحفوظ وقت البيع) × الكمية —
// راجع requirements.md §9.1. مُستبعدة الفواتير الملغاة (Credit Note يصفّر أثرها).
export async function getProfitSummary(): Promise<ProfitSummary> {
  const supabase = createSupabaseServerClient();

  const [{ data: invoices }, { data: items }] = await Promise.all([
    supabase.from("invoices").select<"id, rep_id, status", InvoiceRow>("id, rep_id, status").neq(
      "status",
      "cancelled",
    ),
    supabase
      .from("invoice_items")
      .select<
        "invoice_id, product_id, quantity_in_base_unit, unit_price, cost_price",
        InvoiceItemRow
      >("invoice_id, product_id, quantity_in_base_unit, unit_price, cost_price"),
  ]);

  const repIdByInvoiceId = new Map((invoices ?? []).map((inv) => [inv.id, inv.rep_id]));
  const byRep = new Map<string, { sales: number; profit: number }>();
  const byProduct = new Map<string, { sales: number; profit: number; quantity: number }>();
  let totalSales = 0;
  let totalProfit = 0;

  for (const item of items ?? []) {
    const repId = repIdByInvoiceId.get(item.invoice_id);
    if (!repId) continue;

    const sale = item.unit_price * item.quantity_in_base_unit;
    const profit = (item.unit_price - item.cost_price) * item.quantity_in_base_unit;

    totalSales += sale;
    totalProfit += profit;

    const repEntry = byRep.get(repId) ?? { sales: 0, profit: 0 };
    repEntry.sales += sale;
    repEntry.profit += profit;
    byRep.set(repId, repEntry);

    const productEntry = byProduct.get(item.product_id) ?? { sales: 0, profit: 0, quantity: 0 };
    productEntry.sales += sale;
    productEntry.profit += profit;
    productEntry.quantity += item.quantity_in_base_unit;
    byProduct.set(item.product_id, productEntry);
  }

  return { byRep, byProduct, totalSales, totalProfit };
}
