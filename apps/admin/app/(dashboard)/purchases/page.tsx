import Link from "next/link";
import { Card, ModalTrigger, PageHeader, Breadcrumb, cn } from "@system2026/ui";
import { formatCurrency } from "@system2026/utils";
import { createSupabaseServerClient } from "@system2026/database/server";
import { getProductCatalog } from "../../../lib/get-product-catalog";
import { getCurrentUserRole } from "../../../lib/get-current-role";
import { hasPermission } from "../../../lib/permissions";
import { getAttachmentSignedUrl } from "../../../lib/get-attachment-url";
import { PurchaseForm } from "./purchase-form";
import { RecordInvoicePaymentForm } from "./record-payment-form";

const ATTACHMENTS_BUCKET = "purchase-invoice-attachments";

type PurchaseInvoiceRow = {
  id: string;
  invoice_date: string;
  total_amount: number;
  payment_status: string;
  supplier_id: string;
  attachment_path: string | null;
};

type SupplierPaymentRow = { purchase_invoice_id: string | null; amount: number };

const PAYMENT_STATUS_LABELS: Record<string, string> = {
  paid: "مدفوعة",
  partial: "جزئي",
  unpaid: "غير مدفوعة",
};

const STATUS_FILTERS: { label: string; value?: string }[] = [
  { label: "الكل", value: undefined },
  { label: "مدفوعة", value: "paid" },
  { label: "جزئي", value: "partial" },
  { label: "غير مدفوعة", value: "unpaid" },
];

export default async function PurchasesPage({
  searchParams,
}: {
  searchParams: { status?: string };
}) {
  const supabase = createSupabaseServerClient();
  const role = await getCurrentUserRole();
  const canManage = hasPermission(role, "manage_purchases");

  let purchaseInvoicesQuery = supabase
    .from("purchase_invoices")
    .select<
      "id, invoice_date, total_amount, payment_status, supplier_id, attachment_path",
      PurchaseInvoiceRow
    >("id, invoice_date, total_amount, payment_status, supplier_id, attachment_path")
    .order("invoice_date", { ascending: false });
  if (searchParams.status) {
    purchaseInvoicesQuery = purchaseInvoicesQuery.eq(
      "payment_status",
      searchParams.status as "paid" | "partial" | "unpaid",
    );
  }

  const [{ data: purchaseInvoices }, { data: suppliers }, { data: payments }, catalog, { data: categories }, { data: units }] =
    await Promise.all([
      purchaseInvoicesQuery,
      supabase.from("suppliers").select<"id, name", { id: string; name: string }>("id, name").order("name"),
      supabase
        .from("supplier_payments")
        .select<"purchase_invoice_id, amount", SupplierPaymentRow>("purchase_invoice_id, amount"),
      getProductCatalog(),
      supabase.from("categories").select<"id, name", { id: string; name: string }>("id, name").order("name"),
      supabase.from("units").select<"id, name", { id: string; name: string }>("id, name").order("name"),
    ]);

  const supplierNameById = new Map((suppliers ?? []).map((s) => [s.id, s.name]));
  const canCreatePurchase = (suppliers?.length ?? 0) > 0 && (units?.length ?? 0) > 0;

  const paidByInvoice = new Map<string, number>();
  for (const p of payments ?? []) {
    if (!p.purchase_invoice_id) continue;
    paidByInvoice.set(p.purchase_invoice_id, (paidByInvoice.get(p.purchase_invoice_id) ?? 0) + p.amount);
  }

  const attachmentUrls = await Promise.all(
    (purchaseInvoices ?? []).map((inv) => getAttachmentSignedUrl(supabase, ATTACHMENTS_BUCKET, inv.attachment_path)),
  );
  const attachmentUrlByInvoiceId = new Map(
    (purchaseInvoices ?? []).map((inv, i) => [inv.id, attachmentUrls[i] ?? null]),
  );

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumb={<Breadcrumb items={["لوحة التحكم", "الموردين", "المشتريات"]} />}
        title="فواتير الشراء"
        subtitle="تسجيل فواتير الشراء من الموردين واحتساب متوسط التكلفة تلقائيًا"
        actions={
          canManage ? (
            <ModalTrigger label="+ فاتورة شراء" title="فاتورة شراء جديدة" size="lg">
              {canCreatePurchase ? (
                <PurchaseForm
                  suppliers={suppliers ?? []}
                  catalog={catalog}
                  categories={categories ?? []}
                  units={units ?? []}
                />
              ) : (
                <p className="text-sm text-foreground/60">
                  أضف مورد ووحدة قياس واحدة على الأقل أولًا لتتمكن من تسجيل فاتورة شراء
                </p>
              )}
            </ModalTrigger>
          ) : null
        }
      />

      <Card>
        <div className="mb-4 flex flex-wrap gap-2">
          {STATUS_FILTERS.map((s) => {
            const isActive = (searchParams.status ?? "") === (s.value ?? "");
            const href = s.value ? `/purchases?status=${s.value}` : "/purchases";
            return (
              <Link
                key={s.label}
                href={href}
                className={cn(
                  "inline-flex h-9 items-center justify-center rounded-full px-4 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "border border-border bg-background hover:bg-muted",
                )}
              >
                {s.label}
              </Link>
            );
          })}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-right text-foreground/60">
                <th className="py-2">التاريخ</th>
                <th>المورد</th>
                <th>الإجمالي</th>
                <th>المتبقي</th>
                <th>حالة الدفع</th>
                <th>المرفق</th>
                {canManage ? <th></th> : null}
              </tr>
            </thead>
            <tbody>
              {(purchaseInvoices ?? []).map((inv) => {
                const remaining = inv.total_amount - (paidByInvoice.get(inv.id) ?? 0);
                const isSettled = inv.payment_status !== "unpaid" && inv.payment_status !== "partial";
                return (
                  <tr key={inv.id} className="border-b border-border/50">
                    <td className="py-2">{new Date(inv.invoice_date).toLocaleDateString("ar-SA")}</td>
                    <td>{supplierNameById.get(inv.supplier_id) ?? "—"}</td>
                    <td>{formatCurrency(inv.total_amount)}</td>
                    <td>{isSettled ? "—" : formatCurrency(remaining)}</td>
                    <td>{PAYMENT_STATUS_LABELS[inv.payment_status] ?? inv.payment_status}</td>
                    <td>
                      {attachmentUrlByInvoiceId.get(inv.id) ? (
                        <a
                          href={attachmentUrlByInvoiceId.get(inv.id)!}
                          target="_blank"
                          rel="noreferrer"
                          className="text-primary underline"
                        >
                          عرض المرفق
                        </a>
                      ) : (
                        "—"
                      )}
                    </td>
                    {canManage ? (
                      <td>
                        {!isSettled ? (
                          <ModalTrigger label="تسجيل دفعة" title="تسجيل دفعة" variant="outline" buttonSize="sm">
                            <RecordInvoicePaymentForm
                              supplierId={inv.supplier_id}
                              purchaseInvoiceId={inv.id}
                              remaining={remaining}
                            />
                          </ModalTrigger>
                        ) : null}
                      </td>
                    ) : null}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {(purchaseInvoices?.length ?? 0) === 0 ? (
          <p className="py-4 text-foreground/60">لا توجد فواتير شراء بعد</p>
        ) : null}
      </Card>
    </div>
  );
}
