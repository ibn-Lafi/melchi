import { z } from "zod";

export const recordCustomerPaymentSchema = z.object({
  customerId: z.string().uuid(),
  invoiceId: z.string().uuid().optional(),
  amount: z.number().positive(),
  method: z.enum(["cash", "check", "transfer"]),
});

export type RecordCustomerPaymentInput = z.infer<typeof recordCustomerPaymentSchema>;
