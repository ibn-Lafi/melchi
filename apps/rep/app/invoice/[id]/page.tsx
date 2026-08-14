import { notFound } from "next/navigation";
import { Card } from "@system2026/ui";
import { formatCurrency, renderQrCodeDataUrl } from "@system2026/utils";
import { createSupabaseServerClient } from "@system2026/database/server";
import { AppNav } from "../../../components/nav";
import { PrintButton } from "../../../components/print-button";
import { InvoiceActions } from "./invoice-actions";

type InvoiceDetail = {
  id: string;
  invoice_number: number;
  invoice_date: string;
  subtotal: number;
  vat_amount: number;
  total_amount: number;
  qr_code_data: string;
  status: string;
  customer_id: string;
};

type InvoiceItemRow = {
  id: string;
  product_id: string;
  unit_id: string;
  quantity_in_unit: number;
  unit_price: number;
  subtotal: number;
};

const STATUS_LABELS: Record<string, string> = {
  paid: "مدفوعة",
  partial: "جزئي",
  unpaid: "غير مدفوعة",
  cancelled: "ملغاة",
};

// RLS (reps_view_own_invoices) يقيّد النتيجة تلقائيًا لفواتير المندوب الحالي
// فقط — محاولة فتح فاتورة مندوب آخر تُرجع صفًا فارغًا وليس خطأ.
export default async function RepInvoiceDetailPage({ params }: { params: { id: string } }) {
  const supabase = createSupabaseServerClient();

  const { data: invoice } = await supabase
    .from("invoices")
    .select<
      "id, invoice_number, invoice_date, subtotal, vat_amount, total_amount, qr_code_data, status, customer_id",
      InvoiceDetail
    >(
      "id, invoice_number, invoice_date, subtotal, vat_amount, total_amount, qr_code_data, status, customer_id",
    )
    .eq("id", params.id)
    .single();

  if (!invoice) notFound();

  const [{ data: items }, { data: customer }, { data: products }, { data: units }, { data: settings }, { data: pendingRequests }] =
    await Promise.all([
      supabase
        .from("invoice_items")
        .select<
          "id, product_id, unit_id, quantity_in_unit, unit_price, subtotal",
          InvoiceItemRow
        >("id, product_id, unit_id, quantity_in_unit, unit_price, subtotal")
        .eq("invoice_id", invoice.id),
      supabase
        .from("customers")
        .select<"name, shop_name", { name: string; shop_name: string | null }>("name, shop_name")
        .eq("id", invoice.customer_id)
        .single(),
      supabase.from("products").select<"id, name", { id: string; name: string }>("id, name"),
      supabase.from("units").select<"id, name", { id: string; name: string }>("id, name"),
      supabase
        .from("system_settings")
        .select<"invoice_edit_grace_period_minutes", { invoice_edit_grace_period_minutes: number }>(
          "invoice_edit_grace_period_minutes",
        )
        .eq("id", 1)
        .single(),
      supabase
        .from("invoice_edit_requests")
        .select<"id", { id: string }>("id")
        .eq("invoice_id", invoice.id)
        .eq("status", "pending"),
    ]);

  const productNameById = new Map((products ?? []).map((p) => [p.id, p.name]));
  const unitNameById = new Map((units ?? []).map((u) => [u.id, u.name]));
  const qrCodeImage = await renderQrCodeDataUrl(invoice.qr_code_data);

  const graceMinutes = settings?.invoice_edit_grace_period_minutes ?? 30;
  const deadline = new Date(invoice.invoice_date).getTime() + graceMinutes * 60_000;
  const withinGracePeriod = Date.now() <= deadline;
  const hasPendingRequest = (pendingRequests?.length ?? 0) > 0;

  return (
    <div>
      <AppNav />
      <main className="mx-auto max-w-xl p-4 pb-28 sm:pb-8">
        <div className="no-print mb-3 flex justify-end">
          <PrintButton />
        </div>
        <Card className="text-center">
          <span className="inline-block rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
            {STATUS_LABELS[invoice.status] ?? invoice.status}
          </span>
          <h1 className="mt-3 text-2xl font-bold">فاتورة #{invoice.invoice_number}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {new Date(invoice.invoice_date).toLocaleString("ar-SA")}
          </p>
          <p className="text-sm text-muted-foreground">{customer?.shop_name ?? customer?.name ?? "—"}</p>
          <div className="mt-4 flex justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={qrCodeImage}
              alt="QR الفاتورة"
              width={140}
              height={140}
              className="rounded-xl border border-border p-2"
            />
          </div>
        </Card>

        <Card className="mt-3 divide-y divide-border p-0">
          {(items ?? []).map((item) => (
            <div key={item.id} className="flex items-center justify-between gap-3 p-4">
              <div>
                <p className="font-medium">{productNameById.get(item.product_id) ?? "—"}</p>
                <p className="text-xs text-muted-foreground">
                  {item.quantity_in_unit} × {unitNameById.get(item.unit_id) ?? "—"} @{" "}
                  {formatCurrency(item.unit_price)}
                </p>
              </div>
              <p className="shrink-0 font-semibold">{formatCurrency(item.subtotal)}</p>
            </div>
          ))}
        </Card>

        <Card className="mt-3 space-y-1.5 text-sm">
          <div className="flex justify-between text-muted-foreground">
            <span>المجموع قبل الضريبة</span>
            <span>{formatCurrency(invoice.subtotal)}</span>
          </div>
          <div className="flex justify-between text-muted-foreground">
            <span>ضريبة القيمة المضافة</span>
            <span>{formatCurrency(invoice.vat_amount)}</span>
          </div>
          <div className="flex justify-between border-t border-border pt-1.5 text-base font-bold">
            <span>الإجمالي</span>
            <span>{formatCurrency(invoice.total_amount)}</span>
          </div>
        </Card>

        {invoice.status !== "cancelled" ? (
          <div className="mt-4">
            <InvoiceActions
              invoiceId={invoice.id}
              withinGracePeriod={withinGracePeriod}
              hasPendingRequest={hasPendingRequest}
            />
          </div>
        ) : null}
      </main>
    </div>
  );
}
