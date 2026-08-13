import { z } from "zod";

export const updateSystemSettingsSchema = z.object({
  companyName: z.string().min(1, "اسم الشركة مطلوب"),
  vatRegistrationNumber: z.string().min(1, "الرقم الضريبي مطلوب"),
  commercialRegistrationNumber: z.string().optional(),
  companyAddress: z.string().optional(),
  invoiceEditGracePeriodMinutes: z.number().int().positive(),
  expiryAlertDaysThreshold: z.number().int().positive(),
});

export type UpdateSystemSettingsInput = z.infer<typeof updateSystemSettingsSchema>;
