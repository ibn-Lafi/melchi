import { createSupabaseServerClient } from "@system2026/database/server";

export type CatalogUnit = { unitId: string; unitName: string };
export type CatalogProduct = { productId: string; productName: string; units: CatalogUnit[] };

type ProductRow = { id: string; name: string; base_unit_id: string; supplier_id: string | null };

function buildCatalog(
  products: ProductRow[],
  units: { id: string; name: string }[],
  productUnits: { product_id: string; unit_id: string }[],
): CatalogProduct[] {
  const unitNameById = new Map(units.map((u) => [u.id, u.name]));

  return products.map((product) => {
    const alternateUnits: CatalogUnit[] = productUnits
      .filter((pu) => pu.product_id === product.id)
      .map((pu) => ({ unitId: pu.unit_id, unitName: unitNameById.get(pu.unit_id) ?? "" }));

    return {
      productId: product.id,
      productName: product.name,
      units: [{ unitId: product.base_unit_id, unitName: unitNameById.get(product.base_unit_id) ?? "" }, ...alternateUnits],
    };
  });
}

// كل مورد له قائمة منتجاته الخاصة (products.supplier_id) — كتالوج "المنتج
// الموجود" بفورم فاتورة الشراء يجب أن يقتصر على منتجات هذا المورد فقط،
// وليس كل منتجات النظام أو منتجات صفحة المنتجات العامة (supplier_id فارغ).
export async function getProductCatalogForSupplier(supplierId: string): Promise<CatalogProduct[]> {
  const supabase = createSupabaseServerClient();

  const [{ data: products }, { data: units }, { data: productUnits }] = await Promise.all([
    supabase
      .from("products")
      .select<"id, name, base_unit_id, supplier_id", ProductRow>("id, name, base_unit_id, supplier_id")
      .eq("supplier_id", supplierId)
      .order("name"),
    supabase.from("units").select<"id, name", { id: string; name: string }>("id, name"),
    supabase
      .from("product_units")
      .select<"product_id, unit_id", { product_id: string; unit_id: string }>("product_id, unit_id"),
  ]);

  return buildCatalog(products ?? [], units ?? [], productUnits ?? []);
}

// نفس الفكرة، لكن لكل الموردين دفعة واحدة (لصفحة /purchases العامة التي
// تسمح باختيار أي مورد) — خريطة supplierId → كتالوج منتجاته فقط.
export async function getProductCatalogGroupedBySupplier(): Promise<Record<string, CatalogProduct[]>> {
  const supabase = createSupabaseServerClient();

  const [{ data: products }, { data: units }, { data: productUnits }] = await Promise.all([
    supabase
      .from("products")
      .select<"id, name, base_unit_id, supplier_id", ProductRow>("id, name, base_unit_id, supplier_id")
      .not("supplier_id", "is", null)
      .order("name"),
    supabase.from("units").select<"id, name", { id: string; name: string }>("id, name"),
    supabase
      .from("product_units")
      .select<"product_id, unit_id", { product_id: string; unit_id: string }>("product_id, unit_id"),
  ]);

  const bySupplier = new Map<string, ProductRow[]>();
  for (const product of products ?? []) {
    if (!product.supplier_id) continue;
    const list = bySupplier.get(product.supplier_id) ?? [];
    list.push(product);
    bySupplier.set(product.supplier_id, list);
  }

  const result: Record<string, CatalogProduct[]> = {};
  for (const [supplierId, supplierProducts] of bySupplier) {
    result[supplierId] = buildCatalog(supplierProducts, units ?? [], productUnits ?? []);
  }
  return result;
}
