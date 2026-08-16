"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@system2026/database/server";
import { createSupplierSchema, updateSupplierSchema } from "@system2026/validation";
import type { ActionState } from "../../../components/action-form";

export async function createSupplierAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = createSupplierSchema.safeParse({
    name: formData.get("name"),
    phone: formData.get("phone") || undefined,
    address: formData.get("address") || undefined,
    notes: formData.get("notes") || undefined,
    commercialRegistrationNumber: formData.get("commercialRegistrationNumber") || undefined,
    vatNumber: formData.get("vatNumber") || undefined,
  });

  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "بيانات غير صالحة" };

  const supabase = createSupabaseServerClient();
  const { error } = await supabase.from("suppliers").insert({
    name: parsed.data.name,
    phone: parsed.data.phone ?? null,
    address: parsed.data.address ?? null,
    notes: parsed.data.notes ?? null,
    commercial_registration_number: parsed.data.commercialRegistrationNumber ?? null,
    vat_number: parsed.data.vatNumber ?? null,
  });

  if (error) return { error: error.message };

  revalidatePath("/suppliers");
  return { success: true };
}

export async function updateSupplierAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = updateSupplierSchema.safeParse({
    id: formData.get("id"),
    name: formData.get("name"),
    phone: formData.get("phone") || undefined,
    address: formData.get("address") || undefined,
    notes: formData.get("notes") || undefined,
    commercialRegistrationNumber: formData.get("commercialRegistrationNumber") || undefined,
    vatNumber: formData.get("vatNumber") || undefined,
  });

  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "بيانات غير صالحة" };

  const supabase = createSupabaseServerClient();
  const { error } = await supabase
    .from("suppliers")
    .update({
      name: parsed.data.name,
      phone: parsed.data.phone ?? null,
      address: parsed.data.address ?? null,
      notes: parsed.data.notes ?? null,
      commercial_registration_number: parsed.data.commercialRegistrationNumber ?? null,
      vat_number: parsed.data.vatNumber ?? null,
    })
    .eq("id", parsed.data.id);

  if (error) return { error: error.message };

  revalidatePath("/suppliers");
  revalidatePath(`/suppliers/${parsed.data.id}`);
  return { success: true };
}
