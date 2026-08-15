import { formatCurrency } from "@system2026/utils";
import { DocumentHeader } from "./document-header";

export type ReceiptPrintItem = {
  id: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  conditionLabel: string;
};

export type ReceiptPrintProps = {
  companyName: string;
  companyVatNumber?: string | null;
  companyCommercialRegistration?: string | null;
  companyAddress?: string | null;
  documentTitle: string; // "سند قبض" أو "إشعار مرتجع بضاعة"
  documentNumber: string;
  documentDate: string;
  customerName: string;
  branchName?: string | null;
  repName?: string | null;
  relatedInvoiceNumber?: number | null;
  items?: ReceiptPrintItem[];
  amount: number;
  amountLabel: string;
  methodLabel?: string | null;
  notes?: string | null;
};

// مستند A4 مشترك لسندات القبض وإشعارات المرتجع — ليست فواتير ضريبية،
// لذا بلا رمز QR (راجع CLAUDE.md §4.5: QR للفاتورة الضريبية فقط). يُستخدم
// بنفس نمط طباعة/تصدير InvoicePrintDocument بتطبيق المندوب.
export function ReceiptPrintDocument({
  companyName,
  companyVatNumber,
  companyCommercialRegistration,
  companyAddress,
  documentTitle,
  documentNumber,
  documentDate,
  customerName,
  branchName,
  repName,
  relatedInvoiceNumber,
  items,
  amount,
  amountLabel,
  methodLabel,
  notes,
}: ReceiptPrintProps) {
  const date = new Date(documentDate);
  const dateLabel = date.toLocaleDateString("ar-SA-u-nu-latn", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const timeLabel = date.toLocaleTimeString("ar-SA-u-nu-latn", { hour: "2-digit", minute: "2-digit" });

  return (
    <div
      id="invoice-print-root"
      dir="rtl"
      className="mx-auto min-h-[297mm] w-[210mm] bg-white p-[14mm] text-[11px] leading-relaxed text-neutral-900 shadow-card print:m-0 print:w-full print:shadow-none"
    >
      <DocumentHeader
        companyName={companyName}
        companyVatNumber={companyVatNumber}
        companyCommercialRegistration={companyCommercialRegistration}
        companyAddress={companyAddress}
        title={documentTitle}
        documentNumberLabel="الرقم المرجعي"
        documentNumber={documentNumber}
        dateLabel={dateLabel}
        timeLabel={timeLabel}
      />

      {/* ===== من / إلى ===== */}
      <div className="mt-5 grid grid-cols-2 gap-4 border-t border-neutral-200 pt-4">
        <div>
          <p className="mb-1 font-bold underline decoration-neutral-300 underline-offset-4">مصدرة من:</p>
          <p className="font-semibold">{companyName}</p>
          {companyAddress ? <p className="text-neutral-600">{companyAddress}</p> : null}
        </div>
        <div className="text-left">
          <p className="mb-1 font-bold underline decoration-neutral-300 underline-offset-4">مصدرة إلى:</p>
          <p className="font-semibold">{customerName}</p>
          {branchName ? <p className="text-neutral-600">فرع: {branchName}</p> : null}
        </div>
      </div>

      {/* ===== تفاصيل المستند ===== */}
      <div className="mt-4 grid grid-cols-2 gap-4 border-t border-neutral-200 pt-4">
        <div>
          {relatedInvoiceNumber ? (
            <p>
              <span className="text-neutral-500">متعلق بالفاتورة رقم: </span>#{relatedInvoiceNumber}
            </p>
          ) : null}
          {methodLabel ? (
            <p>
              <span className="text-neutral-500">طريقة الاستلام: </span>
              {methodLabel}
            </p>
          ) : null}
        </div>
        <div className="text-left">
          {repName ? (
            <p>
              <span className="text-neutral-500">المندوب: </span>
              {repName}
            </p>
          ) : null}
        </div>
      </div>

      {/* ===== بنود المرتجع (إن وُجدت) ===== */}
      {items && items.length > 0 ? (
        <table className="mt-5 w-full border-collapse text-[11px]">
          <thead>
            <tr className="border-y border-neutral-300 bg-neutral-50 text-neutral-600">
              <th className="py-2 pr-2 text-right font-semibold">المنتج</th>
              <th className="text-right font-semibold">الحالة</th>
              <th className="text-right font-semibold">الكمية</th>
              <th className="text-right font-semibold">السعر</th>
              <th className="pl-2 text-left font-semibold">الإجمالي</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className="border-b border-neutral-200">
                <td className="py-2 pr-2">{item.productName}</td>
                <td>{item.conditionLabel}</td>
                <td>{item.quantity}</td>
                <td>{formatCurrency(item.unitPrice)}</td>
                <td className="pl-2 text-left font-medium">{formatCurrency(item.subtotal)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}

      {/* ===== الإجمالي ===== */}
      <div className="mt-4 mr-auto w-64 space-y-1.5 border-t border-neutral-300 pt-3">
        <div className="flex justify-between text-sm font-extrabold">
          <span>{amountLabel}</span>
          <span>{formatCurrency(amount)}</span>
        </div>
      </div>

      {/* ===== ملاحظات ===== */}
      {notes ? (
        <div className="mt-5 border-t border-neutral-200 pt-3">
          <p className="mb-1 font-bold">ملاحظات:</p>
          <p className="whitespace-pre-wrap text-neutral-700">{notes}</p>
        </div>
      ) : null}
    </div>
  );
}
