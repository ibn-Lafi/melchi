import { createSupabaseServerClient } from "@system2026/database/server";

export type RepDashboardStats = {
  repName: string;
  totalSales: number;
  invoiceCount: number;
  amountDue: number;
  totalReturns: number;
};

// كل الاستعلامات هنا تعتمد على RLS (invoices_select_own_rep،
// payments_select_own_rep، return_records_select_own_rep) لتقييد
// النتائج تلقائيًا لبيانات المندوب الحالي فقط.
export async function getRepDashboardStats(): Promise<RepDashboardStats> {
  const supabase = createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: profile }, { data: invoices }, { data: returns }] = await Promise.all([
    supabase
      .from("profiles")
      .select<"name", { name: string }>("name")
      .eq("id", user?.id ?? "")
      .single(),
    supabase
      .from("invoices")
      .select<
        "id, total_amount, status",
        { id: string; total_amount: number; status: string }
      >("id, total_amount, status"),
    supabase
      .from("return_records")
      .select<"total_credit_amount", { total_credit_amount: number }>("total_credit_amount"),
  ]);

  const activeInvoices = (invoices ?? []).filter((inv) => inv.status !== "cancelled");
  const dueInvoices = activeInvoices.filter((inv) => inv.status === "unpaid" || inv.status === "partial");

  let amountDue = dueInvoices.reduce((sum, inv) => sum + inv.total_amount, 0);

  const dueInvoiceIds = dueInvoices.map((inv) => inv.id);
  if (dueInvoiceIds.length > 0) {
    const { data: payments } = await supabase
      .from("payments")
      .select<"invoice_id, amount", { invoice_id: string | null; amount: number }>("invoice_id, amount")
      .in("invoice_id", dueInvoiceIds);
    amountDue -= (payments ?? []).reduce((sum, p) => sum + p.amount, 0);
  }

  return {
    repName: profile?.name ?? "",
    totalSales: activeInvoices.reduce((sum, inv) => sum + inv.total_amount, 0),
    invoiceCount: activeInvoices.length,
    amountDue: Math.max(amountDue, 0),
    totalReturns: (returns ?? []).reduce((sum, r) => sum + r.total_credit_amount, 0),
  };
}
