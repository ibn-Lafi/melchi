import { z } from "zod";

export const updateCompanyInfoSchema = z.object({
  companyName: z.string().min(1, "اسم الشركة مطلوب"),
  vatRegistrationNumber: z.string().min(1, "الرقم الضريبي مطلوب"),
  commercialRegistrationNumber: z.string().optional(),
  companyAddress: z.string().optional(),
});

export const updateInvoiceGracePeriodSchema = z.object({
  invoiceEditGracePeriodMinutes: z.number().int().positive(),
});

export const updateExpiryAlertThresholdSchema = z.object({
  expiryAlertDaysThreshold: z.number().int().positive(),
});

export const updateStoreBrandingSchema = z.object({
  storeName: z.string().min(1, "اسم المتجر مطلوب"),
  heroKicker: z.string().min(1, "النص العلوي مطلوب"),
  heroTitle: z.string().min(1, "عنوان الرئيسية مطلوب"),
  siteDescription: z.string().optional(),
});

export const updateStoreSocialLinksSchema = z.object({
  whatsappNumber: z.string().optional(),
  instagramUrl: z.string().url("رابط انستغرام غير صالح").optional().or(z.literal("")),
  tiktokUrl: z.string().url("رابط تيك توك غير صالح").optional().or(z.literal("")),
});

export const updateStoreHomepageSectionsSchema = z.object({
  showPointsOfSaleSection: z.boolean().default(true),
});

export const updateStoreThemeSchema = z.object({
  useDefaultTheme: z.boolean().default(true),
  customCss: z.string().optional(),
  customHtml: z.string().optional(),
});

export type UpdateCompanyInfoInput = z.infer<typeof updateCompanyInfoSchema>;
export type UpdateInvoiceGracePeriodInput = z.infer<typeof updateInvoiceGracePeriodSchema>;
export type UpdateExpiryAlertThresholdInput = z.infer<typeof updateExpiryAlertThresholdSchema>;
export type UpdateStoreBrandingInput = z.infer<typeof updateStoreBrandingSchema>;
export type UpdateStoreSocialLinksInput = z.infer<typeof updateStoreSocialLinksSchema>;
export type UpdateStoreHomepageSectionsInput = z.infer<typeof updateStoreHomepageSectionsSchema>;
export type UpdateStoreThemeInput = z.infer<typeof updateStoreThemeSchema>;
