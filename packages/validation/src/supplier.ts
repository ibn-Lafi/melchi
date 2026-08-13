import { z } from "zod";

export const createSupplierSchema = z.object({
  name: z.string().min(1, "اسم المورد مطلوب"),
  phone: z.string().optional(),
  address: z.string().optional(),
  notes: z.string().optional(),
});

export const purchaseInvoiceItemSchema = z.object({
  productId: z.string().uuid(),
  unitId: z.string().uuid(),
  quantityInUnit: z.number().positive(),
  unitCost: z.number().nonnegative(),
});

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
