import { createSupabaseServerClient } from "@system2026/database/server";

export type RepCatalogUnit = {
  unitId: string;
  unitName: string;
  conversionFactorToBase: number;
  price: number;
};

export type RepCatalogProduct = {
  productId: string;
  productName: string;
  quantityAvailable: number;
  units: RepCatalogUnit[];
};

// يجمع بيانات المخزون المشترك (warehouse_stock — مخزن واحد للنظام كامل،
// راجع CLAUDE.md) + المنتجات + الوحدات البديلة بدون الاعتماد على Embedded
// Resources التلقائية بـ Supabase (تحتاج بيانات Relationships الدقيقة بـ
// types.ts، وهي مبسّطة حاليًا كونها مكتوبة يدويًا وليست مولّدة فعليًا).
export async function getRepCatalog(): Promise<RepCatalogProduct[]> {
  const supabase = createSupabaseServerClient();

  const { data: inventory } = await supabase
    .from("warehouse_stock")
    .select<"product_id, quantity_available", { product_id: string; quantity_available: number }>(
      "product_id, quantity_available",
    )
    .gt("quantity_available", 0);

  const productIds = (inventory ?? []).map((row) => row.product_id);
  if (productIds.length === 0) return [];

  const { data: products } = await supabase
    .from("products")
    .select<
      "id, name, price, base_unit_id",
      { id: string; name: string; price: number; base_unit_id: string }
    >("id, name, price, base_unit_id")
    .in("id", productIds);

  const { data: units } = await supabase
    .from("units")
    .select<"id, name", { id: string; name: string }>("id, name");

  const { data: productUnits } = await supabase
    .from("product_units")
    .select<
      "product_id, unit_id, conversion_factor_to_base, unit_price",
      { product_id: string; unit_id: string; conversion_factor_to_base: number; unit_price: number | null }
    >("product_id, unit_id, conversion_factor_to_base, unit_price")
    .in("product_id", productIds);

  const unitNameById = new Map((units ?? []).map((u) => [u.id, u.name]));
  const quantityByProductId = new Map((inventory ?? []).map((row) => [row.product_id, row.quantity_available]));

  return (products ?? []).map((product) => {
    const alternateUnits: RepCatalogUnit[] = (productUnits ?? [])
      .filter((pu) => pu.product_id === product.id)
      .map((pu) => ({
        unitId: pu.unit_id,
        unitName: unitNameById.get(pu.unit_id) ?? "",
        conversionFactorToBase: pu.conversion_factor_to_base,
        price: pu.unit_price ?? product.price * pu.conversion_factor_to_base,
      }));

    const baseUnit: RepCatalogUnit = {
      unitId: product.base_unit_id,
      unitName: unitNameById.get(product.base_unit_id) ?? "",
      conversionFactorToBase: 1,
      price: product.price,
    };

    return {
      productId: product.id,
      productName: product.name,
      quantityAvailable: quantityByProductId.get(product.id) ?? 0,
      units: [baseUnit, ...alternateUnits],
    };
  });
}
