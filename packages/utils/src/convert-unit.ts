// تحويل وحدة بيع/شراء (كرتون...) إلى الوحدة الأساسية (قطعة...) — راجع requirements.md §4.2
export function convertToBaseUnit(quantityInUnit: number, conversionFactorToBase: number): number {
  return quantityInUnit * conversionFactorToBase;
}

export function convertCostToBaseUnit(costPerUnit: number, conversionFactorToBase: number): number {
  return costPerUnit / conversionFactorToBase;
}
