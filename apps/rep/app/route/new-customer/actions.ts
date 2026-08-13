"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@system2026/database/server";
import { createCustomerSchema } from "@system2026/validation";

export type CreateCustomerActionState = { error?: string };

export async function createCustomerAction(
  _prevState: CreateCustomerActionState,
  formData: FormData,
): Promise<CreateCustomerActionState> {
  const parsed = createCustomerSchema.safeParse({
    name: formData.get("name"),
    shopName: formData.get("shopName") || undefined,
    phone: formData.get("phone") || undefined,
    address: formData.get("address") || undefined,
    googleMapsLink: formData.get("googleMapsLink") || undefined,
    showInStore: false,
    repIds: [],
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "بيانات غير صالحة" };
  }

  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "الجلسة منتهية، يرجى إعادة تسجيل الدخول" };

  // customers_insert_rep (RLS) تسمح للمندوب بإضافة عميل جديد لخط سيره فقط
  // (راجع requirements.md §7.2) — بدون صلاحية إظهاره بالمتجر العام.
  const { data: customer, error } = await supabase
    .from("customers")
    .insert({
      name: parsed.data.name,
      shop_name: parsed.data.shopName ?? null,
      phone: parsed.data.phone ?? null,
      address: parsed.data.address ?? null,
      google_maps_link: parsed.data.googleMapsLink ?? null,
      show_in_store: false,
    })
    .select<"id", { id: string }>("id")
    .single();

  if (error || !customer) return { error: error?.message ?? "تعذّر إنشاء العميل" };

  const { error: linkError } = await supabase
    .from("customer_reps")
    .insert({ customer_id: customer.id, rep_id: user.id });

  if (linkError) return { error: linkError.message };

  redirect("/route");
}
