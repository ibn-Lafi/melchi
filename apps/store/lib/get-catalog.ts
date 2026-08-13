import { createSupabaseServerClient } from "@system2026/database/server";

export type StoreProduct = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  category_id: string | null;
  category_name: string | null;
  base_unit_name: string;
};

export type StoreCategory = { id: string; name: string };

export async function getStoreProducts(categoryId?: string): Promise<StoreProduct[]> {
  const supabase = createSupabaseServerClient();
  let query = supabase.from("public_products").select("*").order("name");

  if (categoryId) {
    query = query.eq("category_id", categoryId);
  }

  const { data } = await query;
  return data ?? [];
}

export async function getStoreProduct(productId: string): Promise<StoreProduct | null> {
  const supabase = createSupabaseServerClient();
  const { data } = await supabase.from("public_products").select("*").eq("id", productId).single();
  return data;
}

export async function getStoreCategories(): Promise<StoreCategory[]> {
  const supabase = createSupabaseServerClient();
  const { data } = await supabase.from("public_categories").select("*").order("name");
  return data ?? [];
}
