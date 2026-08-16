import { z } from "zod";

export const createSupplierSchema = z.object({
  name: z.string().min(1, "اسم المورد مطلوب"),
  phone: z.string().optional(),
  address: z.string().optional(),
  notes: z.string().optional(),
  commercialRegistrationNumber: z.string().optional(),
  vatNumber: z.string().optional(),
});

export type CreateSupplierInput = z.infer<typeof createSupplierSchema>;

export const updateSupplierSchema = createSupplierSchema.extend({
  id: z.string().uuid(),
});

export type UpdateSupplierInput = z.infer<typeof updateSupplierSchema>;

const existingProductPurchaseItemSchema = z.object({
  kind: z.literal("existing"),
  productId: z.string().uuid(),
  unitId: z.string().uuid(),
  quantityInUnit: z.number().positive(),
  unitCost: z.number().nonnegative(),
});

// بند فاتورة شراء لمنتج غير موجود بالكتالوج بعد — يُنشأ المنتج أولًا (راجع
// createPurchaseInvoiceAction) ثم يُستخدم بنفس دالة create_purchase_invoice
// RPC كأي بند عادي. لا وحدة بديلة هنا (وحدته الأساسية فقط، معامل تحويل 1).
const newProductPurchaseItemSchema = z.object({
  kind: z.literal("new"),
  name: z.string().min(1, "اسم المنتج مطلوب"),
  price: z.number().nonnegative("سعر البيع يجب أن يكون صفر أو أكبر"),
  baseUnitId: z.string().uuid(),
  categoryId: z.string().uuid().optional(),
  quantityInUnit: z.number().positive(),
  unitCost: z.number().nonnegative(),
});

export const purchaseInvoiceItemSchema = z.discriminatedUnion("kind", [
  existingProductPurchaseItemSchema,
  newProductPurchaseItemSchema,
]);

export const createPurchaseInvoiceSchema = z.object({
  supplierId: z.string().uuid(),
  items: z.array(purchaseInvoiceItemSchema).min(1, "يجب إضافة بند واحد على الأقل"),
  paymentStatus: z.enum(["paid", "partial", "unpaid"]).default("unpaid"),
});

export type CreatePurchaseInvoiceInput = z.infer<typeof createPurchaseInvoiceSchema>;

export const recordSupplierPaymentSchema = z.object({
  supplierId: z.string().uuid(),
  purchaseInvoiceId: z.string().uuid().optional(),
  amount: z.number().positive(),
  method: z.enum(["cash", "check", "transfer"]),
});
