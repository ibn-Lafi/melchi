import { notFound } from "next/navigation";
import { Card } from "@system2026/ui";
import { formatCurrency, renderQrCodeDataUrl } from "@system2026/utils";
import { createSupabaseServerClient } from "@system2026/database/server";
import { AppNav } from "../../../components/nav";
import { PrintButton } from "../../../components/print-button";

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

  const [{ data: items }, { data: customer }, { data: products }, { data: units }] = await Promise.all([
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
  ]);

  const productNameById = new Map((products ?? []).map((p) => [p.id, p.name]));
  const unitNameById = new Map((units ?? []).map((u) => [u.id, u.name]));
  const qrCodeImage = await renderQrCodeDataUrl(invoice.qr_code_data);

  return (
    <div>
      <AppNav />
      <main className="mx-auto max-w-xl p-4">
        <div className="no-print mb-3 flex justify-end">
          <PrintButton />
        </div>
        <Card>
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-xl font-bold">فاتورة #{invoice.invoice_number}</h1>
              <p className="text-sm text-foreground/60">
                {new Date(invoice.invoice_date).toLocaleString("ar-SA")}
              </p>
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qrCodeImage} alt="QR الفاتورة" width={120} height={120} />
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
            <p>
              <span className="text-foreground/60">العميل: </span>
              {customer?.shop_name ?? customer?.name ?? "—"}
            </p>
            <p>
              <span className="text-foreground/60">الحالة: </span>
              {STATUS_LABELS[invoice.status] ?? invoice.status}
            </p>
          </div>

          <table className="mt-4 w-full text-sm">
            <thead>
              <tr className="border-b border-border text-right text-foreground/60">
                <th className="py-2">المنتج</th>
                <th>الوحدة</th>
                <th>الكمية</th>
                <th>السعر</th>
                <th>الإجمالي</th>
              </tr>
            </thead>
            <tbody>
              {(items ?? []).map((item) => (
                <tr key={item.id} className="border-b border-border/50">
                  <td className="py-2">{productNameById.get(item.product_id) ?? "—"}</td>
                  <td>{unitNameById.get(item.unit_id) ?? "—"}</td>
                  <td>{item.quantity_in_unit}</td>
                  <td>{formatCurrency(item.unit_price)}</td>
                  <td>{formatCurrency(item.subtotal)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="mt-4 space-y-1 text-sm">
            <div className="flex justify-between">
              <span>المجموع قبل الضريبة</span>
              <span>{formatCurrency(invoice.subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span>ضريبة القيمة المضافة</span>
              <span>{formatCurrency(invoice.vat_amount)}</span>
            </div>
            <div className="flex justify-between text-base font-bold">
              <span>الإجمالي</span>
              <span>{formatCurrency(invoice.total_amount)}</span>
            </div>
          </div>
        </Card>
      </main>
    </div>
  );
}
