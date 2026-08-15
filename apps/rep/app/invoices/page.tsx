import { createSupabaseServerClient } from "@system2026/database/server";
import { AppNav } from "../../components/nav";
import { InvoicesFilterList, type DocumentRow } from "./invoices-filter-list";

type InvoiceRow = {
  id: string;
  invoice_number: number;
  invoice_date: string;
  total_amount: number;
  status: string;
  customer_id: string;
};

type ReturnRow = {
  id: string;
  return_date: string;
  total_credit_amount: number;
  customer_id: string;
};

const STATUS_LABELS: Record<string, string> = {
  paid: "مدفوعة",
  partial: "جزئي",
  unpaid: "غير مدفوعة",
  cancelled: "ملغاة",
};

// RLS تقيّد النتيجتين تلقائيًا لفواتير/مرتجعات المندوب الحالي فقط. القائمة
// تدمج الفواتير والمرتجعات معًا (فلتر "النوع": جديدة/مسددة جزئي/مرتجع).
export default async function InvoicesPage() {
  const supabase = createSupabaseServerClient();

  const [{ data: invoices }, { data: returns }] = await Promise.all([
    supabase
      .from("invoices")
      .select<
        "id, invoice_number, invoice_date, total_amount, status, customer_id",
        InvoiceRow
      >("id, invoice_number, invoice_date, total_amount, status, customer_id")
      .order("invoice_date", { ascending: false }),
    supabase
      .from("return_records")
      .select<"id, return_date, total_credit_amount, customer_id", ReturnRow>(
        "id, return_date, total_credit_amount, customer_id",
      )
      .order("return_date", { ascending: false }),
  ]);

  const customerIds = [
    ...new Set([...(invoices ?? []).map((i) => i.customer_id), ...(returns ?? []).map((r) => r.customer_id)]),
  ];
  const { data: customers } =
    customerIds.length > 0
      ? await supabase
          .from("customers")
          .select<"id, name, shop_name", { id: string; name: string; shop_name: string | null }>(
            "id, name, shop_name",
          )
          .in("id", customerIds)
      : { data: [] as { id: string; name: string; shop_name: string | null }[] };

  const customerNameById = new Map((customers ?? []).map((c) => [c.id, c.shop_name ?? c.name]));

  const rows: DocumentRow[] = [
    ...(invoices ?? []).map((inv) => ({
      id: inv.id,
      type: "invoice" as const,
      number: `#${inv.invoice_number}`,
      date: inv.invoice_date,
      amount: inv.total_amount,
      statusLabel: STATUS_LABELS[inv.status] ?? inv.status,
      customerName: customerNameById.get(inv.customer_id) ?? "—",
      href: `/invoice/${inv.id}`,
    })),
    ...(returns ?? []).map((ret) => ({
      id: ret.id,
      type: "return" as const,
      number: `#${ret.id.split("-")[0]?.toUpperCase() ?? ret.id}`,
      date: ret.return_date,
      amount: ret.total_credit_amount,
      statusLabel: "مرتجع",
      customerName: customerNameById.get(ret.customer_id) ?? "—",
      href: `/return/${ret.id}`,
    })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <div>
      <AppNav />
      <main className="mx-auto max-w-2xl p-4 pb-28">
        <h1 className="mb-4 text-xl font-bold">الفواتير</h1>
        {rows.length === 0 ? (
          <p className="py-12 text-center text-muted-foreground">لا توجد فواتير بعد</p>
        ) : (
          <InvoicesFilterList rows={rows} />
        )}
      </main>
    </div>
  );
}
