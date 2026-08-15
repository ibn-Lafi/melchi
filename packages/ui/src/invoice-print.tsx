import { formatCurrency } from "@system2026/utils";

export type InvoicePrintItem = {
  id: string;
  productName: string;
  unitName: string;
  quantity: number;
  listUnitPrice: number;
  unitPrice: number;
  subtotal: number;
};

export type InvoicePrintProps = {
  companyName: string;
  companyVatNumber: string;
  companyCommercialRegistration?: string | null;
  companyAddress?: string | null;
  invoiceNumber: number;
  invoiceDate: string;
  statusLabel: string;
  paymentMethodLabel: string;
  customerName: string;
  branchName?: string | null;
  repName?: string | null;
  discountPercentage: number;
  items: InvoicePrintItem[];
  subtotal: number;
  vatAmount: number;
  totalAmount: number;
  notes?: string | null;
  qrCodeImage: string;
};

// مستند الفاتورة الضريبية بمقاس A4 — مُستخدم مطابقًا بالأدمن وتطبيق
// المندوب (راجع CLAUDE.md §3: أي شيء مشترك ينتقل لـ packages/). يُطبع عبر
// window.print()، وقواعد @media print بكل تطبيق (globals.css) تُظهر هذا
// العنصر فقط (id="invoice-print-root") بحجم الصفحة الفعلي بغض النظر عن
// تخطيط الصفحة المحيطة به على الشاشة.
export function InvoicePrintDocument({
  companyName,
  companyVatNumber,
  companyCommercialRegistration,
  companyAddress,
  invoiceNumber,
  invoiceDate,
  statusLabel,
  paymentMethodLabel,
  customerName,
  branchName,
  repName,
  discountPercentage,
  items,
  subtotal,
  vatAmount,
  totalAmount,
  notes,
  qrCodeImage,
}: InvoicePrintProps) {
  const date = new Date(invoiceDate);
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
      {/* ===== ترويسة الصفحة: بيانات الشركة (من إعدادات الأدمن) في المنتصف ===== */}
      <div className="border-b border-neutral-200 pb-4 text-center">
        <p className="text-lg font-extrabold">{companyName}</p>
        <div className="mt-1.5 flex flex-wrap items-center justify-center gap-x-3 gap-y-0.5 text-[10px] text-neutral-600">
          {companyCommercialRegistration ? <span>السجل التجاري: {companyCommercialRegistration}</span> : null}
          {companyVatNumber ? <span>الرقم الضريبي: {companyVatNumber}</span> : null}
          {companyAddress ? <span>{companyAddress}</span> : null}
        </div>
      </div>

      {/* ===== عنوان الفاتورة (يمين) وتاريخها (يسار) ===== */}
      <div className="mt-4 flex items-start justify-between">
        <div>
          <h1 className="text-lg font-extrabold">فاتورة ضريبية</h1>
          <p className="mt-1">
            <span className="text-neutral-500">رقم الفاتورة: </span>#{invoiceNumber}
          </p>
        </div>
        <div className="text-left">
          <p className="font-semibold">{dateLabel}</p>
          <p className="text-neutral-500">{timeLabel}</p>
          <p className="mt-1 inline-block rounded-full bg-neutral-100 px-3 py-0.5 text-[10px] font-medium">
            {statusLabel}
          </p>
        </div>
      </div>

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

      {/* ===== تفاصيل الدفع والفاتورة ===== */}
      <div className="mt-4 grid grid-cols-2 gap-4 border-t border-neutral-200 pt-4">
        <div>
          <p className="mb-1 font-bold underline decoration-neutral-300 underline-offset-4">تفاصيل الدفع:</p>
          <p>
            <span className="text-neutral-500">المبلغ: </span>
            {formatCurrency(totalAmount)}
          </p>
          <p>
            <span className="text-neutral-500">طريقة الدفع: </span>
            {paymentMethodLabel}
          </p>
        </div>
        <div className="text-left">
          <p className="mb-1 font-bold underline decoration-neutral-300 underline-offset-4">تفاصيل الفاتورة:</p>
          {repName ? (
            <p>
              <span className="text-neutral-500">المندوب: </span>
              {repName}
            </p>
          ) : null}
          {discountPercentage > 0 ? (
            <p>
              <span className="text-neutral-500">نسبة الخصم المتفق عليها: </span>
              {discountPercentage}%
            </p>
          ) : null}
        </div>
      </div>

      {/* ===== جدول المنتجات ===== */}
      <table className="mt-5 w-full border-collapse text-[11px]">
        <thead>
          <tr className="border-y border-neutral-300 bg-neutral-50 text-neutral-600">
            <th className="py-2 pr-2 text-right font-semibold">المنتج</th>
            <th className="text-right font-semibold">الوحدة</th>
            <th className="text-right font-semibold">الكمية</th>
            <th className="text-right font-semibold">السعر</th>
            <th className="pl-2 text-left font-semibold">الإجمالي</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id} className="border-b border-neutral-200">
              <td className="py-2 pr-2">{item.productName}</td>
              <td>{item.unitName}</td>
              <td>{item.quantity}</td>
              <td>
                {formatCurrency(item.unitPrice)}
                {item.listUnitPrice > item.unitPrice ? (
                  <span className="mr-1 text-neutral-400 line-through">
                    {formatCurrency(item.listUnitPrice)}
                  </span>
                ) : null}
              </td>
              <td className="pl-2 text-left font-medium">{formatCurrency(item.subtotal)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* ===== المجاميع ===== */}
      <div className="mt-4 mr-auto w-64 space-y-1.5 border-t border-neutral-300 pt-3">
        <div className="flex justify-between">
          <span className="text-neutral-500">الإجمالي الفرعي (غير شامل الضريبة)</span>
          <span>{formatCurrency(subtotal)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-neutral-500">ضريبة القيمة المضافة (15%)</span>
          <span>{formatCurrency(vatAmount)}</span>
        </div>
        <div className="flex justify-between border-t border-neutral-300 pt-1.5 text-sm font-extrabold">
          <span>إجمالي الفاتورة</span>
          <span>{formatCurrency(totalAmount)}</span>
        </div>
      </div>

      {/* ===== ملاحظات ===== */}
      {notes ? (
        <div className="mt-5 border-t border-neutral-200 pt-3">
          <p className="mb-1 font-bold">ملاحظات:</p>
          <p className="whitespace-pre-wrap text-neutral-700">{notes}</p>
        </div>
      ) : null}

      {/* ===== QR ===== */}
      <div className="mt-6 flex flex-col items-center border-t border-neutral-200 pt-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={qrCodeImage} alt="QR الفاتورة الضريبية" width={90} height={90} />
        <p className="mt-1 text-[10px] text-neutral-500">امسح الرمز للاطلاع على الفاتورة الضريبية</p>
      </div>
    </div>
  );
}
