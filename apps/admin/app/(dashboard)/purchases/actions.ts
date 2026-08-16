"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@system2026/database/server";
import { createPurchaseInvoiceSchema } from "@system2026/validation";
import { uploadPrivateFile } from "../../../lib/upload-private-file";

export type PurchaseActionState = { error?: string; purchaseInvoiceId?: string };

export async function createPurchaseInvoiceAction(
  _prevState: PurchaseActionState,
  formData: FormData,
): Promise<PurchaseActionState> {
  const rawItems = formData.get("items");
  let items: unknown;
  try {
    items = JSON.parse(typeof rawItems === "string" ? rawItems : "[]");
  } catch {
    return { error: "بيانات البنود غير صالحة" };
  }

  const parsed = createPurchaseInvoiceSchema.safeParse({
    supplierId: formData.get("supplierId"),
    items,
    paymentStatus: formData.get("paymentStatus"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "بيانات فاتورة الشراء غير صالحة" };
  }

  const supabase = createSupabaseServerClient();

  // منتجات جديدة (غير موجودة بالكتالوج) تُنشأ أولًا بـ INSERT عادي — إنشاء
  // منتج ليس عملية مخزون حرجة، فلا داعي لتمريرها عبر RPC. بعدها تُعامل
  // بنودها كأي بند عادي بنفس دالة create_purchase_invoice (المعاملة
  // الحرجة الفعلية: purchase_invoices + المخزون + متوسط التكلفة).
  // visible_in_store = false افتراضيًا: منتج جديد بالشراء غالبًا بلا صورة
  // أو وصف بعد، فلا يُعرض بالمتجر تلقائيًا قبل مراجعة الأدمن له.
  const resolvedItems: { product_id: string; unit_id: string; quantity_in_unit: number; unit_cost: number }[] = [];
  for (const item of parsed.data.items) {
    if (item.kind === "existing") {
      resolvedItems.push({
        product_id: item.productId,
        unit_id: item.unitId,
        quantity_in_unit: item.quantityInUnit,
        unit_cost: item.unitCost,
      });
      continue;
    }

    const { data: newProduct, error: productError } = await supabase
      .from("products")
      .insert({
        name: item.name,
        price: item.price,
        base_unit_id: item.baseUnitId,
        category_id: item.categoryId ?? null,
        // كل منتج يُنشأ عبر فاتورة شراء يُربط تلقائيًا بمورد هذه الفاتورة —
        // منتجات المورد قائمة خاصة به (راجع requirements.md)، فلا يجوز أن
        // يظهر منتج جديد بلا مورد بالكتالوج العام بالخطأ.
        supplier_id: parsed.data.supplierId,
        visible_in_store: false,
      })
      .select<"id", { id: string }>("id")
      .single();

    if (productError || !newProduct) return { error: productError?.message ?? "تعذّر إنشاء المنتج الجديد" };

    resolvedItems.push({
      product_id: newProduct.id,
      unit_id: item.baseUnitId,
      quantity_in_unit: item.quantityInUnit,
      unit_cost: item.unitCost,
    });
  }

  const { data: purchaseInvoiceId, error } = await supabase.rpc("create_purchase_invoice", {
    p_supplier_id: parsed.data.supplierId,
    p_items: resolvedItems,
    p_payment_status: parsed.data.paymentStatus,
  });

  if (error) return { error: error.message };

  // رفع مرفق الفاتورة (اختياري) — عملية غير حرجة تُنفَّذ بعد اعتماد الفاتورة
  // نفسها؛ فشلها لا يجب أن يُسقط الفاتورة التي اعتُمدت بالفعل بالمعاملة أعلاه.
  const { path: attachmentPath, error: attachmentError } = await uploadPrivateFile(
    supabase,
    formData,
    "attachment",
    "purchase-invoice-attachments",
  );
  if (attachmentPath) {
    await supabase.rpc("set_purchase_invoice_attachment", {
      p_purchase_invoice_id: purchaseInvoiceId,
      p_attachment_path: attachmentPath,
    });
  }

  revalidatePath("/purchases");
  revalidatePath("/warehouse");
  revalidatePath("/products");
  revalidatePath("/suppliers");
  return { error: attachmentError, purchaseInvoiceId: purchaseInvoiceId ?? undefined };
}
