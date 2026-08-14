"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@system2026/database/server";
import { createCustomerSchema } from "@system2026/validation";
import type { ActionState } from "../../../components/action-form";

export async function createCustomerAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const repIds = formData.getAll("repIds").filter((v): v is string => typeof v === "string" && v.length > 0);

  const parsed = createCustomerSchema.safeParse({
    name: formData.get("name"),
    shopName: formData.get("shopName") || undefined,
    phone: formData.get("phone") || undefined,
    address: formData.get("address") || undefined,
    googleMapsLink: formData.get("googleMapsLink") || undefined,
    showInStore: formData.get("showInStore") === "on",
    repIds,
  });

  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "بيانات غير صالحة" };

  const supabase = createSupabaseServerClient();
  const { data: customer, error } = await supabase
    .from("customers")
    .insert({
      name: parsed.data.name,
      shop_name: parsed.data.shopName ?? null,
      phone: parsed.data.phone ?? null,
      address: parsed.data.address ?? null,
      google_maps_link: parsed.data.googleMapsLink ?? null,
      show_in_store: parsed.data.showInStore,
    })
    .select<"id", { id: string }>("id")
    .single();

  if (error || !customer) return { error: error?.message ?? "تعذّر إنشاء العميل" };

  if (parsed.data.repIds.length > 0) {
    const { error: linkError } = await supabase
      .from("customer_reps")
      .insert(parsed.data.repIds.map((repId) => ({ customer_id: customer.id, rep_id: repId })));
    if (linkError) return { error: linkError.message };
  }

  revalidatePath("/customers");
  return { success: true };
}
