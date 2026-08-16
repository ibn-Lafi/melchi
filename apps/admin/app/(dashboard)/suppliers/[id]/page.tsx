import { notFound } from "next/navigation";
import { Card, Input, ModalTrigger, PageHeader, Breadcrumb, Select } from "@system2026/ui";
import { formatCurrency } from "@system2026/utils";
import { createSupabaseServerClient } from "@system2026/database/server";
import { ActionForm } from "../../../../components/action-form";
import { getCurrentUserRole } from "../../../../lib/get-current-role";
import { hasPermission } from "../../../../lib/permissions";
import { getProductCatalog } from "../../../../lib/get-product-catalog";
import { getAttachmentSignedUrl } from "../../../../lib/get-attachment-url";
import { updateSupplierAction } from "../actions";
import { createProductAction } from "../../products/actions";
import { PurchaseForm } from "../../purchases/purchase-form";

const ATTACHMENTS_BUCKET = "purchase-invoice-attachments";

type SupplierDetail = {
  id: string;
  name: string;
  phone: string | null;
  address: string | null;
  notes: string | null;
  commercial_registration_number: string | null;
  vat_number: string | null;
};

type PurchaseInvoiceRow = {
  id: string;
  invoice_date: string;
  total_amount: number;
  payment_status: string;
  attachment_path: string | null;
};

type SupplierPaymentRow = {
  id: string;
  payment_date: string;
  amount: number;
  method: string;
  purchase_invoice_id: string | null;
};

type ProductRow = {
  id: string;
  name: string;
  price: number;
  is_active: boolean;
};

type Category = { id: string; name: string };
type Unit = { id: string; name: string };

const PAYMENT_STATUS_LABELS: Record<string, string> = {
  paid: "مدفوعة",
  partial: "جزئي",
  unpaid: "غير مدفوعة",
};

const METHOD_LABELS: Record<string, string> = {
  cash: "نقدًا",
  check: "شيك",
  transfer: "تحويل بنكي",
};

export default async function SupplierDetailPage({ params }: { params: { id: string } }) {
  const supabase = createSupabaseServerClient();
  const role = await getCurrentUserRole();
  const canManage = hasPermission(role, "manage_purchases");

  const { data: supplier } = await supabase
    .from("suppliers")
    .select<
      "id, name, phone, address, notes, commercial_registration_number, vat_number",
      SupplierDetail
    >("id, name, phone, address, notes, commercial_registration_number, vat_number")
    .eq("id", params.id)
    .single();

  if (!supplier) notFound();

  const [
    { data: purchaseInvoices },
    { data: payments },
    { data: supplierProducts },
    { data: categories },
    { data: units },
    catalog,
  ] = await Promise.all([
    supabase
      .from("purchase_invoices")
      .select<
        "id, invoice_date, total_amount, payment_status, attachment_path",
        PurchaseInvoiceRow
      >("id, invoice_date, total_amount, payment_status, attachment_path")
      .eq("supplier_id", supplier.id)
      .order("invoice_date", { ascending: false }),
    supabase
      .from("supplier_payments")
      .select<"id, payment_date, amount, method, purchase_invoice_id", SupplierPaymentRow>(
        "id, payment_date, amount, method, purchase_invoice_id",
      )
      .eq("supplier_id", supplier.id)
      .order("payment_date", { ascending: false }),
    supabase
      .from("products")
      .select<"id, name, price, is_active", ProductRow>("id, name, price, is_active")
      .eq("supplier_id", supplier.id)
      .order("name"),
    supabase.from("categories").select<"id, name", Category>("id, name").order("name"),
    supabase.from("units").select<"id, name", Unit>("id, name").order("name"),
    getProductCatalog(),
  ]);

  const paidByInvoice = new Map<string, number>();
  for (const p of payments ?? []) {
    if (!p.purchase_invoice_id) continue;
    paidByInvoice.set(p.purchase_invoice_id, (paidByInvoice.get(p.purchase_invoice_id) ?? 0) + p.amount);
  }

  const totalOwed = (purchaseInvoices ?? [])
    .filter((inv) => inv.payment_status === "unpaid" || inv.payment_status === "partial")
    .reduce((sum, inv) => sum + (inv.total_amount - (paidByInvoice.get(inv.id) ?? 0)), 0);

  const attachmentUrls = await Promise.all(
    (purchaseInvoices ?? []).map((inv) => getAttachmentSignedUrl(supabase, ATTACHMENTS_BUCKET, inv.attachment_path)),
  );
  const attachmentUrlByInvoiceId = new Map(
    (purchaseInvoices ?? []).map((inv, i) => [inv.id, attachmentUrls[i] ?? null]),
  );

  const canCreatePurchase = (units?.length ?? 0) > 0;

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumb={<Breadcrumb items={["لوحة التحكم", "الموردين", supplier.name]} />}
        title={supplier.name}
        subtitle="كشف حساب المورد: بياناته، منتجاته، فواتير الشراء، والمستحق"
        actions={
          canManage ? (
            <ModalTrigger label="+ فاتورة شراء" title={`فاتورة شراء — ${supplier.name}`} size="lg">
              {canCreatePurchase ? (
                <PurchaseForm
                  suppliers={[{ id: supplier.id, name: supplier.name }]}
                  catalog={catalog}
                  categories={categories ?? []}
                  units={units ?? []}
                />
              ) : (
                <p className="text-sm text-foreground/60">أضف وحدة قياس واحدة على الأقل أولًا لتتمكن من تسجيل فاتورة شراء</p>
              )}
            </ModalTrigger>
          ) : null
        }
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <div className="mb-2 flex items-center justify-between">
            <h2 className="font-semibold">بيانات المورد</h2>
            {canManage ? (
              <ModalTrigger label="تعديل" title={`تعديل: ${supplier.name}`} variant="outline" buttonSize="sm">
                <ActionForm action={updateSupplierAction} className="space-y-3">
                  <input type="hidden" name="id" value={supplier.id} />
                  <div>
                    <label className="mb-1 block text-sm">الاسم</label>
                    <Input name="name" defaultValue={supplier.name} required />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm">الجوال</label>
                    <Input name="phone" dir="ltr" defaultValue={supplier.phone ?? ""} />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm">العنوان</label>
                    <Input name="address" defaultValue={supplier.address ?? ""} />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm">السجل التجاري (اختياري)</label>
                    <Input
                      name="commercialRegistrationNumber"
                      dir="ltr"
                      defaultValue={supplier.commercial_registration_number ?? ""}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm">الرقم الضريبي (اختياري)</label>
                    <Input name="vatNumber" dir="ltr" defaultValue={supplier.vat_number ?? ""} />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm">ملاحظات</label>
                    <Input name="notes" defaultValue={supplier.notes ?? ""} />
                  </div>
                </ActionForm>
              </ModalTrigger>
            ) : null}
          </div>
          <div className="space-y-1 text-sm">
            <p>
              <span className="text-foreground/60">الجوال: </span>
              {supplier.phone ?? "—"}
            </p>
            <p>
              <span className="text-foreground/60">العنوان: </span>
              {supplier.address ?? "—"}
            </p>
            <p>
              <span className="text-foreground/60">السجل التجاري: </span>
              {supplier.commercial_registration_number ?? "—"}
            </p>
            <p>
              <span className="text-foreground/60">الرقم الضريبي: </span>
              {supplier.vat_number ?? "—"}
            </p>
            <p>
              <span className="text-foreground/60">ملاحظات: </span>
              {supplier.notes ?? "—"}
            </p>
          </div>
        </Card>

        <Card>
          <h2 className="mb-2 font-semibold">المستحق للمورد</h2>
          <p className="text-3xl font-bold">{formatCurrency(totalOwed)}</p>
          <p className="mt-1 text-sm text-foreground/60">
            مجموع فواتير الشراء غير المدفوعة/الجزئية بعد خصم الدفعات المسددة
          </p>
        </Card>
      </div>

      <Card>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold">المنتجات</h2>
          {canManage ? (
            <ModalTrigger label="+ إضافة منتج" title={`إضافة منتج — ${supplier.name}`}>
              <ActionForm action={createProductAction} className="space-y-3">
                <input type="hidden" name="supplierId" value={supplier.id} />
                <div>
                  <label className="mb-1 block text-sm">الاسم</label>
                  <Input name="name" required />
                </div>
                <div>
                  <label className="mb-1 block text-sm">الوصف</label>
                  <Input name="description" />
                </div>
                <div>
                  <label className="mb-1 block text-sm">صورة المنتج</label>
                  <Input name="image" type="file" accept="image/*" />
                </div>
                <div>
                  <label className="mb-1 block text-sm">
                    سعر البيع <span className="text-foreground/50">(شامل ضريبة القيمة المضافة)</span>
                  </label>
                  <Input name="price" type="number" step="0.01" min="0" required />
                </div>
                <div>
                  <label className="mb-1 block text-sm">الكمية بالمخزون (اختياري)</label>
                  <Input name="quantity" type="number" step="1" min="0" placeholder="0" />
                </div>
                <div>
                  <label className="mb-1 block text-sm">الفئة</label>
                  <Select name="categoryId">
                    <option value="">بدون فئة</option>
                    {(categories ?? []).map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </Select>
                </div>
                <div>
                  <label className="mb-1 block text-sm">الوحدة الأساسية</label>
                  <Select name="baseUnitId" required>
                    <option value="">اختر وحدة</option>
                    {(units ?? []).map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name}
                      </option>
                    ))}
                  </Select>
                </div>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" name="visibleInStore" defaultChecked /> ظاهر بالمتجر
                </label>
              </ActionForm>
            </ModalTrigger>
          ) : null}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-right text-foreground/60">
                <th className="py-2">الاسم</th>
                <th>سعر البيع</th>
                <th>الحالة</th>
              </tr>
            </thead>
            <tbody>
              {(supplierProducts ?? []).map((p) => (
                <tr key={p.id} className="border-b border-border/50">
                  <td className="py-2">{p.name}</td>
                  <td>{formatCurrency(p.price)}</td>
                  <td>{p.is_active ? "نشط" : "مؤرشف"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {(supplierProducts?.length ?? 0) === 0 ? (
          <p className="py-4 text-foreground/60">لا توجد منتجات مرتبطة بهذا المورد بعد</p>
        ) : null}
      </Card>

      <Card>
        <h2 className="mb-3 font-semibold">فواتير الشراء</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-right text-foreground/60">
                <th className="py-2">التاريخ</th>
                <th>الإجمالي</th>
                <th>المتبقي</th>
                <th>حالة الدفع</th>
                <th>المرفق</th>
              </tr>
            </thead>
            <tbody>
              {(purchaseInvoices ?? []).map((inv) => (
                <tr key={inv.id} className="border-b border-border/50">
                  <td className="py-2">{new Date(inv.invoice_date).toLocaleDateString("ar-SA")}</td>
                  <td>{formatCurrency(inv.total_amount)}</td>
                  <td>
                    {inv.payment_status === "unpaid" || inv.payment_status === "partial"
                      ? formatCurrency(inv.total_amount - (paidByInvoice.get(inv.id) ?? 0))
                      : "—"}
                  </td>
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
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {(purchaseInvoices?.length ?? 0) === 0 ? (
          <p className="py-4 text-foreground/60">لا توجد فواتير شراء بعد</p>
        ) : null}
      </Card>

      <Card>
        <h2 className="mb-3 font-semibold">الدفعات المسددة</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-right text-foreground/60">
                <th className="py-2">التاريخ</th>
                <th>المبلغ</th>
                <th>الطريقة</th>
              </tr>
            </thead>
            <tbody>
              {(payments ?? []).map((p) => (
                <tr key={p.id} className="border-b border-border/50">
                  <td className="py-2">{new Date(p.payment_date).toLocaleDateString("ar-SA")}</td>
                  <td>{formatCurrency(p.amount)}</td>
                  <td>{METHOD_LABELS[p.method] ?? p.method}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {(payments?.length ?? 0) === 0 ? <p className="py-4 text-foreground/60">لا توجد دفعات بعد</p> : null}
      </Card>
    </div>
  );
}
