"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@system2026/database/server";
import { createProductSchema, createCategorySchema, createUnitSchema } from "@system2026/validation";

export type ActionState = { error?: string; success?: boolean };

export async function createProductAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = createProductSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description") || undefined,
    price: Number(formData.get("price")),
    categoryId: formData.get("categoryId") || undefined,
    visibleInStore: formData.get("visibleInStore") === "on",
    hasExpiry: formData.get("hasExpiry") === "on",
    expiryDate: formData.get("expiryDate") || undefined,
    baseUnitId: formData.get("baseUnitId"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "بيانات غير صالحة" };
  }

  const supabase = createSupabaseServerClient();
  const { error } = await supabase.from("products").insert({
    name: parsed.data.name,
    description: parsed.data.description ?? null,
    price: parsed.data.price,
    category_id: parsed.data.categoryId ?? null,
    visible_in_store: parsed.data.visibleInStore,
    has_expiry: parsed.data.hasExpiry,
    expiry_date: parsed.data.expiryDate ?? null,
    base_unit_id: parsed.data.baseUnitId,
  });

  if (error) return { error: error.message };

  revalidatePath("/products");
  return { success: true };
}

export async function createCategoryAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = createCategorySchema.safeParse({ name: formData.get("name") });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "بيانات غير صالحة" };

  const supabase = createSupabaseServerClient();
  const { error } = await supabase.from("categories").insert({ name: parsed.data.name });
  if (error) return { error: error.message };

  revalidatePath("/products");
  return { success: true };
}

export async function createUnitAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = createUnitSchema.safeParse({ name: formData.get("name") });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "بيانات غير صالحة" };

  const supabase = createSupabaseServerClient();
  const { error } = await supabase.from("units").insert({ name: parsed.data.name });
  if (error) return { error: error.message };

  revalidatePath("/products");
  return { success: true };
}

export async function addProductUnitAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const productId = formData.get("productId");
  const unitId = formData.get("unitId");
  const conversionFactor = Number(formData.get("conversionFactor"));
  const unitPriceRaw = formData.get("unitPrice");

  if (typeof productId !== "string" || typeof unitId !== "string" || !conversionFactor) {
    return { error: "بيانات غير صالحة" };
  }

  const supabase = createSupabaseServerClient();
  const { error } = await supabase.from("product_units").insert({
    product_id: productId,
    unit_id: unitId,
    conversion_factor_to_base: conversionFactor,
    unit_price: unitPriceRaw ? Number(unitPriceRaw) : null,
  });

  if (error) return { error: error.message };

  revalidatePath("/products");
  return { success: true };
}
