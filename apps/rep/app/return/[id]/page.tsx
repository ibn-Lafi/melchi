import { notFound } from "next/navigation";
import { Card, ReceiptPrintDocument, type ReceiptPrintItem } from "@system2026/ui";
import { formatCurrency } from "@system2026/utils";
import { createSupabaseServerClient } from "@system2026/database/server";
import { AppNav } from "../../../components/nav";
import { DocumentPdfActions } from "../../../components/pdf-actions";

const CONDITION_LABELS: Record<string, string> = {
  resalable: "سليم",
  damaged: "تالف",
  expired: "منتهي الصلاحية",
};

type ReturnDetail = {
  id: string;
  invoice_id: string | null;
  customer_id: string;
  rep_id: string | null;
  return_date: string;
  total_credit_amount: number;
};

type ReturnItemRow = { id: string; product_id: string; quantity: number; unit_price: number; condition: string };

type Settings = {
  company_name: string;
  vat_registration_number: string;
  commercial_registration_number: string | null;
  company_address: string | null;
};

// RLS (return_records_select_own_rep) يقيّد النتيجة تلقائيًا لمرتجعات
// المندوب الحالي فقط.
export default async function ReturnDetailPage({ params }: { params: { id: string } }) {
  const supabase = createSupabaseServerClient();

  const { data: ret } = await supabase
    .from("return_records")
    .select<
      "id, invoice_id, customer_id, rep_id, return_date, total_credit_amount",
      ReturnDetail
    >("id, invoice_id, customer_id, rep_id, return_date, total_credit_amount")
    .eq("id", params.id)
    .single();

  if (!ret) notFound();

  const [{ data: items }, { data: customer }, { data: rep }, { data: invoice }, { data: settings }] =
    await Promise.all([
      supabase
        .from("return_items")
        .select<"id, product_id, quantity, unit_price, condition", ReturnItemRow>(
          "id, product_id, quantity, unit_price, condition",
        )
        .eq("return_id", ret.id),
      supabase
        .from("customers")
        .select<"name, shop_name", { name: string; shop_name: string | null }>("name, shop_name")
        .eq("id", ret.customer_id)
        .single(),
      ret.rep_id
        ? supabase.from("profiles").select<"name", { name: string }>("name").eq("id", ret.rep_id).single()
        : Promise.resolve({ data: null as { name: string } | null }),
      ret.invoice_id
        ? supabase
            .from("invoices")
            .select<"invoice_number", { invoice_number: number }>("invoice_number")
            .eq("id", ret.invoice_id)
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

  const productIds = [...new Set((items ?? []).map((i) => i.product_id))];
  const { data: products } =
    productIds.length > 0
      ? await supabase.from("products").select<"id, name", { id: string; name: string }>("id, name").in("id", productIds)
      : { data: [] as { id: string; name: string }[] };
  const productNameById = new Map((products ?? []).map((p) => [p.id, p.name]));

  const printItems: ReceiptPrintItem[] = (items ?? []).map((item) => ({
    id: item.id,
    productName: productNameById.get(item.product_id) ?? "—",
    quantity: item.quantity,
    unitPrice: item.unit_price,
    subtotal: item.quantity * item.unit_price,
    conditionLabel: CONDITION_LABELS[item.condition] ?? item.condition,
  }));

  const shortNumber = ret.id.split("-")[0]?.toUpperCase() ?? ret.id;

  return (
    <div>
      <AppNav />
      <main className="p-4 pb-28">
        <div className="mx-auto max-w-md space-y-4">
          <Card className="space-y-1">
            <p className="text-sm text-muted-foreground">إشعار مرتجع بضاعة</p>
            <p className="text-lg font-bold">{customer?.shop_name ?? customer?.name ?? "—"}</p>
            <p className="text-sm text-muted-foreground">{new Date(ret.return_date).toLocaleDateString("ar-SA")}</p>
            <p className="pt-1 text-xl font-extrabold">{formatCurrency(ret.total_credit_amount)}</p>
          </Card>

          <DocumentPdfActions
            elementId="invoice-print-root"
            fileName={`مرتجع-${shortNumber}`}
            downloadLabel="تنزيل الإشعار"
            shareLabel="إرسال الإشعار"
          />
        </div>
      </main>

      <div className="pointer-events-none fixed -left-[10000px] top-0" aria-hidden="true">
        <ReceiptPrintDocument
          companyName={settings?.company_name ?? ""}
          companyVatNumber={settings?.vat_registration_number}
          companyCommercialRegistration={settings?.commercial_registration_number}
          companyAddress={settings?.company_address}
          documentTitle="إشعار مرتجع بضاعة"
          documentNumber={shortNumber}
          documentDate={ret.return_date}
          customerName={customer?.shop_name ?? customer?.name ?? "—"}
          repName={rep?.name}
          relatedInvoiceNumber={invoice?.invoice_number}
          items={printItems}
          amount={ret.total_credit_amount}
          amountLabel="إجمالي قيمة المرتجع"
        />
      </div>
    </div>
  );
}
