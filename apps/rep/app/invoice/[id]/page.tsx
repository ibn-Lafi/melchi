import { notFound } from "next/navigation";
import { Card, InvoicePrintDocument, type InvoicePrintItem } from "@system2026/ui";
import { formatCurrency, renderQrCodeDataUrl } from "@system2026/utils";
import { createSupabaseServerClient } from "@system2026/database/server";
import { AppNav } from "../../../components/nav";
import { DocumentPdfActions } from "../../../components/pdf-actions";
import { InvoiceActions } from "./invoice-actions";

type InvoiceDetail = {
  id: string;
  invoice_number: number;
  invoice_date: string;
  subtotal: number;
  vat_amount: number;
  total_amount: number;
  qr_code_data: string;
  payment_method: string;
  status: string;
  customer_id: string;
  discount_percentage: number;
  branch_id: string | null;
  notes: string | null;
};

type InvoiceItemRow = {
  id: string;
  product_id: string;
  unit_id: string;
  quantity_in_unit: number;
  unit_price: number;
  subtotal: number;
};

type Settings = {
  company_name: string;
  vat_registration_number: string;
  commercial_registration_number: string | null;
  company_address: string | null;
  invoice_edit_grace_period_minutes: number;
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

// RLS (reps_view_own_invoices) يقيّد النتيجة تلقائيًا لفواتير المندوب الحالي
// فقط — محاولة فتح فاتورة مندوب آخر تُرجع صفًا فارغًا وليس خطأ.
export default async function RepInvoiceDetailPage({ params }: { params: { id: string } }) {
  const supabase = createSupabaseServerClient();

  const { data: invoice } = await supabase
    .from("invoices")
    .select<
      "id, invoice_number, invoice_date, subtotal, vat_amount, total_amount, qr_code_data, payment_method, status, customer_id, discount_percentage, branch_id, notes",
      InvoiceDetail
    >(
      "id, invoice_number, invoice_date, subtotal, vat_amount, total_amount, qr_code_data, payment_method, status, customer_id, discount_percentage, branch_id, notes",
    )
    .eq("id", params.id)
    .single();

  if (!invoice) notFound();

  const [
    { data: items },
    { data: customer },
    { data: products },
    { data: units },
    { data: settings },
    { data: pendingRequests },
    { data: branch },
  ] = await Promise.all([
    supabase
      .from("invoice_items")
      .select<"id, product_id, unit_id, quantity_in_unit, unit_price, subtotal", InvoiceItemRow>(
        "id, product_id, unit_id, quantity_in_unit, unit_price, subtotal",
      )
      .eq("invoice_id", invoice.id),
    supabase
      .from("customers")
      .select<
        "name, shop_name, commercial_registration_number, vat_number, address",
        {
          name: string;
          shop_name: string | null;
          commercial_registration_number: string | null;
          vat_number: string | null;
          address: string | null;
        }
      >("name, shop_name, commercial_registration_number, vat_number, address")
      .eq("id", invoice.customer_id)
      .single(),
    supabase.from("products").select<"id, name", { id: string; name: string }>("id, name"),
    supabase.from("units").select<"id, name", { id: string; name: string }>("id, name"),
    supabase
      .from("system_settings")
      .select<
        "company_name, vat_registration_number, commercial_registration_number, company_address, invoice_edit_grace_period_minutes",
        Settings
      >(
        "company_name, vat_registration_number, commercial_registration_number, company_address, invoice_edit_grace_period_minutes",
      )
      .eq("id", 1)
      .single(),
    supabase
      .from("invoice_edit_requests")
      .select<"id", { id: string }>("id")
      .eq("invoice_id", invoice.id)
      .eq("status", "pending"),
    invoice.branch_id
      ? supabase.from("customer_branches").select<"name", { name: string }>("name").eq("id", invoice.branch_id).single()
      : Promise.resolve({ data: null as { name: string } | null }),
  ]);

  const productNameById = new Map((products ?? []).map((p) => [p.id, p.name]));
  const unitNameById = new Map((units ?? []).map((u) => [u.id, u.name]));
  const qrCodeImage = await renderQrCodeDataUrl(invoice.qr_code_data);

  const graceMinutes = settings?.invoice_edit_grace_period_minutes ?? 30;
  const deadline = new Date(invoice.invoice_date).getTime() + graceMinutes * 60_000;
  const withinGracePeriod = Date.now() <= deadline;
  const hasPendingRequest = (pendingRequests?.length ?? 0) > 0;

  const printItems: InvoicePrintItem[] = (items ?? []).map((item) => ({
    id: item.id,
    productName: productNameById.get(item.product_id) ?? "—",
    unitName: unitNameById.get(item.unit_id) ?? "—",
    quantity: item.quantity_in_unit,
    unitPrice: item.unit_price,
    subtotal: item.subtotal,
  }));

  return (
    <div>
      <AppNav />
      <main className="p-4 pb-28">
        <div className="mx-auto max-w-md space-y-4">
          <Card className="space-y-1">
            <p className="text-sm text-muted-foreground">فاتورة ضريبية</p>
            <p className="text-lg font-bold">فاتورة #{invoice.invoice_number}</p>
            <p className="text-sm text-muted-foreground">
              {customer?.shop_name ?? customer?.name ?? "—"} ·{" "}
              {new Date(invoice.invoice_date).toLocaleDateString("ar-SA")}
            </p>
            <div className="flex items-center justify-between pt-1">
              <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium">
                {STATUS_LABELS[invoice.status] ?? invoice.status}
              </span>
              <p className="text-xl font-extrabold">{formatCurrency(invoice.total_amount)}</p>
            </div>
          </Card>

          <DocumentPdfActions elementId="invoice-print-root" fileName={`فاتورة-${invoice.invoice_number}`} />

          {invoice.status !== "cancelled" ? (
            <InvoiceActions
              invoiceId={invoice.id}
              withinGracePeriod={withinGracePeriod}
              hasPendingRequest={hasPendingRequest}
            />
          ) : null}
        </div>
      </main>

      {/* مستند الطباعة الفعلي — خارج الشاشة عمدًا (وليس display:none حتى
          تقدر html2canvas تلتقطه) ويُستخدم فقط لتوليد ملف PDF عبر
          DocumentPdfActions، وليس للعرض المباشر بهذه الصفحة. */}
      <div className="pointer-events-none fixed -left-[10000px] top-0" aria-hidden="true">
        <InvoicePrintDocument
          companyName={settings?.company_name ?? ""}
          companyVatNumber={settings?.vat_registration_number ?? ""}
          companyCommercialRegistration={settings?.commercial_registration_number}
          companyAddress={settings?.company_address}
          invoiceNumber={invoice.invoice_number}
          invoiceDate={invoice.invoice_date}
          paymentMethodLabel={PAYMENT_LABELS[invoice.payment_method] ?? invoice.payment_method}
          customerName={customer?.shop_name ?? customer?.name ?? "—"}
          customerCommercialRegistration={customer?.commercial_registration_number}
          customerVatNumber={customer?.vat_number}
          customerAddress={customer?.address}
          branchName={branch?.name}
          discountPercentage={invoice.discount_percentage}
          items={printItems}
          subtotal={invoice.subtotal}
          vatAmount={invoice.vat_amount}
          totalAmount={invoice.total_amount}
          notes={invoice.notes}
          qrCodeImage={qrCodeImage}
        />
      </div>
    </div>
  );
}
