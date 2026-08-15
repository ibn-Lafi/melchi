import { z } from "zod";

export const createCustomerSchema = z.object({
  name: z.string().min(1, "اسم العميل مطلوب"),
  shopName: z.string().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  notes: z.string().optional(),
  googleMapsLink: z.string().url("رابط جوجل ماب غير صالح").optional(),
  showInStore: z.boolean().default(false),
  repIds: z.array(z.string().uuid()).default([]),
});

export type CreateCustomerInput = z.infer<typeof createCustomerSchema>;

export const updateCustomerSchema = createCustomerSchema.extend({
  id: z.string().uuid(),
});

export type UpdateCustomerInput = z.infer<typeof updateCustomerSchema>;
