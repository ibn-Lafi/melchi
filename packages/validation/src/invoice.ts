import { z } from "zod";

export const invoiceItemSchema = z.object({
  productId: z.string().uuid(),
  unitId: z.string().uuid(),
  quantityInUnit: z.number().positive(),
});

export const createInvoiceSchema = z.object({
  repId: z.string().uuid(),
  customerId: z.string().uuid(),
  branchId: z.string().uuid().optional(),
  items: z.array(invoiceItemSchema).min(1, "يجب إضافة بند واحد على الأقل"),
  paymentMethod: z.enum(["cash", "credit", "check", "transfer"]),
  discountPercentage: z.number().min(0, "نسبة الخصم لا يمكن أن تكون أقل من 0%").max(25, "نسبة الخصم لا يمكن أن تتجاوز 25%"),
});

export type CreateInvoiceInput = z.infer<typeof createInvoiceSchema>;

export const cancelInvoiceSchema = z.object({
  invoiceId: z.string().uuid(),
  reason: z.string().min(1, "سبب الإلغاء مطلوب"),
});

export const requestInvoiceEditSchema = z.object({
  invoiceId: z.string().uuid(),
  reason: z.string().min(1, "سبب طلب التعديل مطلوب"),
  requestedChanges: z.record(z.string(), z.unknown()),
});

export const reviewInvoiceEditRequestSchema = z.object({
  requestId: z.string().uuid(),
  decision: z.enum(["approved", "rejected"]),
  adminNotes: z.string().optional(),
});
