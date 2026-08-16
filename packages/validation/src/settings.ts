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

export type UpdateCompanyInfoInput = z.infer<typeof updateCompanyInfoSchema>;
export type UpdateInvoiceGracePeriodInput = z.infer<typeof updateInvoiceGracePeriodSchema>;
export type UpdateExpiryAlertThresholdInput = z.infer<typeof updateExpiryAlertThresholdSchema>;
