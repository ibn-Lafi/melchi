import { z } from "zod";

export const loginSchema = z.object({
  phone: z.string().min(1, "رقم الجوال مطلوب"),
  password: z.string().min(6, "كلمة المرور يجب أن تكون 6 أحرف على الأقل"),
});

export type LoginInput = z.infer<typeof loginSchema>;
