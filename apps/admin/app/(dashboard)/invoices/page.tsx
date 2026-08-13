import Link from "next/link";
import { Card } from "@system2026/ui";
import { formatCurrency } from "@system2026/utils";
import { createSupabaseServerClient } from "@system2026/database/server";

type InvoiceRow = {
  id: string;
  invoice_number: number;
  invoice_date: string;
  total_amount: number;
  payment_method: string;
  status: string;
  rep_id: string;
  customer_id: string;
};

const STATUS_LABELS: Record<string, string> = {
  paid: "مدفوعة",
  partial: "جزئي",
  unpaid: "غير مدفوعة",
  cancelled: "ملغاة",
};

const PAYMENT_LABELS: Record<string, string> = {
  cash: "نقدًا",
  credit: "آجل",
  check: "شيك",
  transfer: "تحويل",
};

export default async function InvoicesPage({
  searchParams,
}: {
  searchParams: { repId?: string; status?: string };
}) {
  const supabase = createSupabaseServerClient();

  let query = supabase
    .from("invoices")
    .select<
      "id, invoice_number, invoice_date, total_amount, payment_method, status, rep_id, customer_id",
      InvoiceRow
    >("id, invoice_number, invoice_date, total_amount, payment_method, status, rep_id, customer_id")
    .order("invoice_number", { ascending: false })
    .limit(100);

  if (searchParams.repId) query = query.eq("rep_id", searchParams.repId);
  if (searchParams.status) {
    query = query.eq("status", searchParams.status as "paid" | "partial" | "unpaid" | "cancelled");
  }

  const [{ data: invoices }, { data: reps }, { data: customers }] = await Promise.all([
    query,
    supabase
      .from("profiles")
      .select<"id, name", { id: string; name: string }>("id, name")
      .eq("role", "rep"),
    supabase
      .from("customers")
      .select<"id, name, shop_name", { id: string; name: string; shop_name: string | null }>(
        "id, name, shop_name",
      ),
  ]);

  const repNameById = new Map((reps ?? []).map((r) => [r.id, r.name]));
  const customerNameById = new Map((customers ?? []).map((c) => [c.id, c.shop_name ?? c.name]));

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">الفواتير</h1>

      <Card>
        <form className="mb-4 flex flex-wrap gap-3 text-sm">
          <select
            name="repId"
            defaultValue={searchParams.repId ?? ""}
            className="h-10 rounded-md border border-border bg-background px-3"
          >
            <option value="">كل المناديب</option>
            {(reps ?? []).map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
          <select
            name="status"
            defaultValue={searchParams.status ?? ""}
            className="h-10 rounded-md border border-border bg-background px-3"
          >
            <option value="">كل الحالات</option>
            {Object.entries(STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <button type="submit" className="rounded-md border border-border px-3 py-2">
            فلترة
          </button>
        </form>

        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-right text-foreground/60">
              <th className="py-2">رقم الفاتورة</th>
              <th>التاريخ</th>
              <th>المندوب</th>
              <th>العميل</th>
              <th>الإجمالي</th>
              <th>الدفع</th>
              <th>الحالة</th>
            </tr>
          </thead>
          <tbody>
            {(invoices ?? []).map((inv) => (
              <tr key={inv.id} className="border-b border-border/50">
                <td className="py-2">
                  <Link href={`/invoices/${inv.id}`} className="text-primary underline">
                    #{inv.invoice_number}
                  </Link>
                </td>
                <td>{new Date(inv.invoice_date).toLocaleString("ar-SA")}</td>
                <td>{repNameById.get(inv.rep_id) ?? "—"}</td>
                <td>{customerNameById.get(inv.customer_id) ?? "—"}</td>
                <td>{formatCurrency(inv.total_amount)}</td>
                <td>{PAYMENT_LABELS[inv.payment_method] ?? inv.payment_method}</td>
                <td>{STATUS_LABELS[inv.status] ?? inv.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {(invoices?.length ?? 0) === 0 ? <p className="py-4 text-foreground/60">لا توجد فواتير بعد</p> : null}
      </Card>
    </div>
  );
}
