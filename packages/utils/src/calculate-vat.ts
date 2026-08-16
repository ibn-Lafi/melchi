// نسبة ضريبة القيمة المضافة ثابتة 15% (السعودية) — راجع requirements.md §7.5
export const VAT_RATE = 0.15;

export function calculateVat(subtotal: number): number {
  return roundToTwoDecimals(subtotal * VAT_RATE);
}

export function calculateTotalWithVat(subtotal: number): number {
  return roundToTwoDecimals(subtotal + calculateVat(subtotal));
}

// سعر المنتج الذي يُدخله الأدمن شامل الضريبة (السعر النهائي الذي يدفعه
// العميل) — راجع CLAUDE.md وmigration 20260816090000: نستخرج السعر الصافي
// من داخل السعر الشامل بدل إضافة ضريبة جديدة فوقه، حتى يبقى المجموع
// النهائي مطابقًا لسعر المنتج كما حدّده الأدمن بالضبط.
export function extractNetPriceFromVatInclusive(grossPrice: number): number {
  return roundToTwoDecimals(grossPrice / (1 + VAT_RATE));
}

function roundToTwoDecimals(value: number): number {
  return Math.round(value * 100) / 100;
}
