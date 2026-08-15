import { notFound } from "next/navigation";
import { Card, ReceiptPrintDocument } from "@system2026/ui";
import { formatCurrency } from "@system2026/utils";
import { createSupabaseServerClient } from "@system2026/database/server";
import { AppNav } from "../../../components/nav";
import { DocumentPdfActions } from "../../../components/pdf-actions";

const METHOD_LABELS: Record<string, string> = {
  cash: "نقدًا",
  check: "شيك",
  transfer: "تحويل بنكي",
};

type PaymentDetail = {
  id: string;
  invoice_id: string | null;
  customer_id: string;
  amount: number;
  payment_date: string;
  method: string;
  recorded_by: string;
};

type Settings = {
  company_name: string;
  vat_registration_number: string;
  commercial_registration_number: string | null;
  company_address: string | null;
};

// RLS (payments_select_own_rep) يقيّد النتيجة تلقائيًا لتحصيلات عملاء
// المندوب الحالي فقط.
export default async function CollectionDetailPage({ params }: { params: { id: string } }) {
  const supabase = createSupabaseServerClient();

  const { data: payment } = await supabase
    .from("payments")
    .select<
      "id, invoice_id, customer_id, amount, payment_date, method, recorded_by",
      PaymentDetail
    >("id, invoice_id, customer_id, amount, payment_date, method, recorded_by")
    .eq("id", params.id)
    .single();

  if (!payment) notFound();

  const [{ data: customer }, { data: rep }, { data: invoice }, { data: settings }] = await Promise.all([
    supabase
      .from("customers")
      .select<"name, shop_name", { name: string; shop_name: string | null }>("name, shop_name")
      .eq("id", payment.customer_id)
      .single(),
    supabase.from("profiles").select<"name", { name: string }>("name").eq("id", payment.recorded_by).single(),
    payment.invoice_id
      ? supabase
          .from("invoices")
          .select<"invoice_number", { invoice_number: number }>("invoice_number")
          .eq("id", payment.invoice_id)
          .single()
      : Promise.resolve({ data: null as { invoice_number: number } | null }),
    supabase
      .from("system_settings")
      .select<
        "company_name, vat_registration_number, commercial_registration_number, company_address",
        Settings
      >("company_name, vat_registration_number, commercial_registration_number, company_address")
      .eq("id", 1)
      .single(),
  ]);

  const shortNumber = payment.id.split("-")[0]?.toUpperCase() ?? payment.id;
  const methodLabel = METHOD_LABELS[payment.method] ?? payment.method;

  return (
    <div>
      <AppNav />
      <main className="p-4 pb-28">
        <div className="mx-auto max-w-md space-y-4">
          <Card className="space-y-1">
            <p className="text-sm text-muted-foreground">سند قبض</p>
            <p className="text-lg font-bold">{customer?.shop_name ?? customer?.name ?? "—"}</p>
            <p className="text-sm text-muted-foreground">
              {new Date(payment.payment_date).toLocaleDateString("ar-SA")} · {methodLabel}
            </p>
            <p className="pt-1 text-xl font-extrabold">{formatCurrency(payment.amount)}</p>
          </Card>

          <DocumentPdfActions
            elementId="invoice-print-root"
            fileName={`سند-قبض-${shortNumber}`}
            downloadLabel="تنزيل السند"
            shareLabel="إرسال السند"
          />
        </div>
      </main>

      <div className="pointer-events-none fixed -left-[10000px] top-0" aria-hidden="true">
        <ReceiptPrintDocument
          companyName={settings?.company_name ?? ""}
          companyVatNumber={settings?.vat_registration_number}
          companyCommercialRegistration={settings?.commercial_registration_number}
          companyAddress={settings?.company_address}
          documentTitle="سند قبض"
          documentNumber={shortNumber}
          documentDate={payment.payment_date}
          customerName={customer?.shop_name ?? customer?.name ?? "—"}
          repName={rep?.name}
          relatedInvoiceNumber={invoice?.invoice_number}
          amount={payment.amount}
          amountLabel="قيمة التحصيل"
          methodLabel={methodLabel}
        />
      </div>
    </div>
  );
}
