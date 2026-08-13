import { z } from "zod";

export const productUnitSchema = z.object({
  unitId: z.string().uuid(),
  conversionFactorToBase: z.number().positive(),
  unitPrice: z.number().nonnegative().optional(),
});

export const createProductSchema = z.object({
  name: z.string().min(1, "اسم المنتج مطلوب"),
  description: z.string().optional(),
  price: z.number().nonnegative("السعر يجب أن يكون صفر أو أكبر"),
  categoryId: z.string().uuid().optional(),
  imageUrl: z.string().url().optional(),
  visibleInStore: z.boolean().default(true),
  hasExpiry: z.boolean().default(false),
  expiryDate: z.string().date().optional(),
  baseUnitId: z.string().uuid(),
  units: z.array(productUnitSchema).default([]),
}).refine((data) => !data.hasExpiry || !!data.expiryDate, {
  message: "تاريخ الصلاحية مطلوب عند تفعيل خيار الصلاحية",
  path: ["expiryDate"],
});

export type CreateProductInput = z.infer<typeof createProductSchema>;

export const createCategorySchema = z.object({
  name: z.string().min(1, "اسم الفئة مطلوب"),
});

export const createUnitSchema = z.object({
  name: z.string().min(1, "اسم الوحدة مطلوب"),
});
