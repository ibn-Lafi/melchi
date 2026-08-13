const SAR_FORMATTER = new Intl.NumberFormat("ar-SA", {
  style: "currency",
  currency: "SAR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatCurrency(amount: number): string {
  return SAR_FORMATTER.format(amount);
}
