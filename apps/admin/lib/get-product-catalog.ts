import { createSupabaseServerClient } from "@system2026/database/server";

export type CatalogUnit = { unitId: string; unitName: string };
export type CatalogProduct = { productId: string; productName: string; units: CatalogUnit[] };

// كتالوج كل المنتجات ووحداتها (أساسية + بديلة) — يُستخدم بفورم فواتير الشراء
// ونقل البضاعة، حيث لا يوجد قيد على رصيد المندوب كما بتطبيق rep.
export async function getProductCatalog(): Promise<CatalogProduct[]> {
  const supabase = createSupabaseServerClient();

  const { data: products } = await supabase
    .from("products")
    .select<"id, name, base_unit_id", { id: string; name: string; base_unit_id: string }>(
      "id, name, base_unit_id",
    )
    .order("name");

  const { data: units } = await supabase
    .from("units")
    .select<"id, name", { id: string; name: string }>("id, name");

  const { data: productUnits } = await supabase
    .from("product_units")
    .select<
      "product_id, unit_id",
      { product_id: string; unit_id: string }
    >("product_id, unit_id");

  const unitNameById = new Map((units ?? []).map((u) => [u.id, u.name]));

  return (products ?? []).map((product) => {
    const alternateUnits: CatalogUnit[] = (productUnits ?? [])
      .filter((pu) => pu.product_id === product.id)
      .map((pu) => ({ unitId: pu.unit_id, unitName: unitNameById.get(pu.unit_id) ?? "" }));

    return {
      productId: product.id,
      productName: product.name,
      units: [{ unitId: product.base_unit_id, unitName: unitNameById.get(product.base_unit_id) ?? "" }, ...alternateUnits],
    };
  });
}
