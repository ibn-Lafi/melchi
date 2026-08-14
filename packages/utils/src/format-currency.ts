// "ar-SA" بدون تحديد نظام الأرقام يعرض أرقامًا هندية-عربية (١١٥٫٠٠) افتراضيًا.
// نظام الفوترة يحتاج أرقامًا لاتينية معتادة (115.00) — الأكثر شيوعًا بأنظمة
// الفوترة التجارية بالسعودية ومتوافقة مع تنسيق أرقام QR/TLV بفاتورة.
const SAR_FORMATTER = new Intl.NumberFormat("ar-SA-u-nu-latn", {
  style: "currency",
  currency: "SAR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatCurrency(amount: number): string {
  return SAR_FORMATTER.format(amount);
}
