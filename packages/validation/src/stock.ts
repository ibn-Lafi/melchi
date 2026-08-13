import { z } from "zod";

export const stockTransferItemSchema = z.object({
  productId: z.string().uuid(),
  quantity: z.number().positive(),
});

export const createStockTransferSchema = z.object({
  repId: z.string().uuid(),
  items: z.array(stockTransferItemSchema).min(1, "يجب إضافة منتج واحد على الأقل"),
});

export type CreateStockTransferInput = z.infer<typeof createStockTransferSchema>;
