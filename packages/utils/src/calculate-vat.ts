// نسبة ضريبة القيمة المضافة ثابتة 15% (السعودية) — راجع requirements.md §7.5
export const VAT_RATE = 0.15;

export function calculateVat(subtotal: number): number {
  return roundToTwoDecimals(subtotal * VAT_RATE);
}

export function calculateTotalWithVat(subtotal: number): number {
  return roundToTwoDecimals(subtotal + calculateVat(subtotal));
}

function roundToTwoDecimals(value: number): number {
  return Math.round(value * 100) / 100;
}
