"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@system2026/database/server";
import { createInvoiceSchema } from "@system2026/validation";
import { getRepCatalog, type RepCatalogProduct } from "../../../lib/get-rep-catalog";

export type CreateInvoiceActionState = { error?: string; invoiceId?: string };

export type InvoiceModalCustomer = {
  id: string;
  name: string;
  shop_name: string | null;
  branches: { id: string; name: string }[];
};

export type InvoiceModalData = {
  customers: InvoiceModalCustomer[];
  catalog: RepCatalogProduct[];
};

// تُستدعى عند فتح نافذة "فاتورة جديدة" المنبثقة فقط (وليست بكل تحميل صفحة)
// — البيانات تُجلب كسولًا (lazy) بضغطة الزر مباشرة من مكوّن client عبر
// Server Action، بدل تمريرها كـ props من كل صفحة تعرض شريط التنقل.
export async function getInvoiceModalDataAction(): Promise<InvoiceModalData> {
  const supabase = createSupabaseServerClient();
  const [{ data: customers }, { data: branches }] = await Promise.all([
    supabase
      .from("customers")
      .select<"id, name, shop_name", { id: string; name: string; shop_name: string | null }>(
        "id, name, shop_name",
      )
      .order("name"),
    supabase
      .from("customer_branches")
      .select<"id, customer_id, name", { id: string; customer_id: string; name: string }>(
        "id, customer_id, name",
      )
      .order("name"),
  ]);

  const branchesByCustomer = new Map<string, { id: string; name: string }[]>();
  for (const b of branches ?? []) {
    const list = branchesByCustomer.get(b.customer_id) ?? [];
    list.push({ id: b.id, name: b.name });
    branchesByCustomer.set(b.customer_id, list);
  }

  const customersWithBranches = (customers ?? []).map((c) => ({
    ...c,
    branches: branchesByCustomer.get(c.id) ?? [],
  }));

  const catalog = await getRepCatalog();

  return { customers: customersWithBranches, catalog };
}

export async function createInvoiceAction(
  _prevState: CreateInvoiceActionState,
  formData: FormData,
): Promise<CreateInvoiceActionState> {
  const rawItems = formData.get("items");
  let items: unknown;
  try {
    items = JSON.parse(typeof rawItems === "string" ? rawItems : "[]");
  } catch {
    return { error: "بيانات البنود غير صالحة" };
  }

  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "الجلسة منتهية، يرجى إعادة تسجيل الدخول" };

  const parsed = createInvoiceSchema.safeParse({
    repId: user.id,
    customerId: formData.get("customerId"),
    branchId: formData.get("branchId") || undefined,
    items,
    paymentMethod: formData.get("paymentMethod"),
    discountPercentage: Number(formData.get("discountPercentage") ?? 0),
    notes: formData.get("notes") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "بيانات الفاتورة غير صالحة" };
  }

  const { data: invoiceId, error } = await supabase.rpc("create_invoice_with_stock_check", {
    p_rep_id: parsed.data.repId,
    p_customer_id: parsed.data.customerId,
    p_items: parsed.data.items.map((item) => ({
      product_id: item.productId,
      unit_id: item.unitId,
      quantity_in_unit: item.quantityInUnit,
    })),
    p_payment_method: parsed.data.paymentMethod,
    p_discount_percentage: parsed.data.discountPercentage,
    p_branch_id: parsed.data.branchId ?? null,
    p_notes: parsed.data.notes ?? null,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/route");
  return { invoiceId: invoiceId ?? undefined };
}
