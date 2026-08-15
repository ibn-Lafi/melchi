import Link from "next/link";
import { Card, PageHeader, Breadcrumb } from "@system2026/ui";
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
  discount_percentage: number;
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
  searchParams: { repId?: string; status?: string; paymentMethod?: string; from?: string; to?: string };
}) {
  const supabase = createSupabaseServerClient();

  let query = supabase
    .from("invoices")
    .select<
      "id, invoice_number, invoice_date, total_amount, payment_method, status, rep_id, customer_id, discount_percentage",
      InvoiceRow
    >(
      "id, invoice_number, invoice_date, total_amount, payment_method, status, rep_id, customer_id, discount_percentage",
    )
    .order("invoice_number", { ascending: false })
    .limit(100);

  if (searchParams.repId) query = query.eq("rep_id", searchParams.repId);
  if (searchParams.status) {
    query = query.eq("status", searchParams.status as "paid" | "partial" | "unpaid" | "cancelled");
  }
  if (searchParams.paymentMethod) {
    query = query.eq("payment_method", searchParams.paymentMethod as "cash" | "credit" | "check" | "transfer");
  }
  if (searchParams.from) query = query.gte("invoice_date", searchParams.from);
  if (searchParams.to) query = query.lte("invoice_date", `${searchParams.to}T23:59:59`);

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

  const linkButtonClass =
    "inline-flex h-11 items-center justify-center rounded-xl border border-border bg-background px-4 text-sm font-medium transition-colors hover:bg-muted";

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumb={<Breadcrumb items={["لوحة التحكم", "الفواتير"]} />}
        title="الفواتير"
        subtitle="كل فواتير البيع، مع طلبات التعديل والمرتجعات والتحصيلات"
        actions={
          <>
            <Link href="/invoice-requests" className={linkButtonClass}>
              طلبات تعديل الفواتير
            </Link>
            <Link href="/returns" className={linkButtonClass}>
              المرتجعات
            </Link>
            <Link href="/collections" className={linkButtonClass}>
              التحصيلات
            </Link>
          </>
        }
      />

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
          <select
            name="paymentMethod"
            defaultValue={searchParams.paymentMethod ?? ""}
            className="h-10 rounded-md border border-border bg-background px-3"
          >
            <option value="">كل طرق الدفع</option>
            {Object.entries(PAYMENT_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <input
            type="date"
            name="from"
            defaultValue={searchParams.from ?? ""}
            className="h-10 rounded-md border border-border bg-background px-3"
          />
          <input
            type="date"
            name="to"
            defaultValue={searchParams.to ?? ""}
            className="h-10 rounded-md border border-border bg-background px-3"
          />
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
              <th>نسبة الخصم</th>
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
                <td>{inv.discount_percentage > 0 ? `${inv.discount_percentage}%` : "—"}</td>
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
