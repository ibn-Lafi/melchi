export type DocumentHeaderProps = {
  companyName: string;
  companyVatNumber?: string | null;
  companyCommercialRegistration?: string | null;
  companyAddress?: string | null;
  title: string;
  documentNumberLabel: string;
  documentNumber: string | number;
  dateLabel: string;
  timeLabel: string;
  statusLabel?: string | null;
};

// ترويسة موحّدة لكل مستندات A4 المطبوعة (فاتورة ضريبية، سند قبض، إشعار
// مرتجع) — بيانات الشركة بمنتصف الرأس، وعنوان/رقم المستند يمين، والتاريخ
// يسار. راجع CLAUDE.md §3: أي عنصر مشترك بين مستندات النظام ينتقل هنا.
export function DocumentHeader({
  companyName,
  companyVatNumber,
  companyCommercialRegistration,
  companyAddress,
  title,
  documentNumberLabel,
  documentNumber,
  dateLabel,
  timeLabel,
  statusLabel,
}: DocumentHeaderProps) {
  return (
    <>
      <div className="border-b border-neutral-200 pb-4 text-center">
        <p className="text-lg font-extrabold">{companyName}</p>
        <div className="mt-1.5 flex flex-wrap items-center justify-center gap-x-3 gap-y-0.5 text-[10px] text-neutral-600">
          {companyCommercialRegistration ? <span>السجل التجاري: {companyCommercialRegistration}</span> : null}
          {companyVatNumber ? <span>الرقم الضريبي: {companyVatNumber}</span> : null}
          {companyAddress ? <span>{companyAddress}</span> : null}
        </div>
      </div>

      <div className="mt-4 flex items-start justify-between">
        <div>
          <h1 className="text-lg font-extrabold">{title}</h1>
          <p className="mt-1">
            <span className="text-neutral-500">{documentNumberLabel}: </span>#{documentNumber}
          </p>
        </div>
        <div className="text-left">
          <p className="font-semibold">{dateLabel}</p>
          <p className="text-neutral-500">{timeLabel}</p>
          {statusLabel ? (
            <p className="mt-1 inline-block rounded-full bg-neutral-100 px-3 py-0.5 text-[10px] font-medium">
              {statusLabel}
            </p>
          ) : null}
        </div>
      </div>
    </>
  );
}
