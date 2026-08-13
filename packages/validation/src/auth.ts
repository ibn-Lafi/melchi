import { z } from "zod";

export const loginSchema = z.object({
  phone: z.string().min(1, "رقم الجوال مطلوب"),
  password: z.string().min(6, "كلمة المرور يجب أن تكون 6 أحرف على الأقل"),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const createStaffUserSchema = z.object({
  name: z.string().min(1, "الاسم مطلوب"),
  phone: z.string().min(1, "رقم الجوال مطلوب"),
  password: z.string().min(6, "كلمة المرور يجب أن تكون 6 أحرف على الأقل"),
  role: z.enum(["admin", "accountant", "rep"]),
});

export type CreateStaffUserInput = z.infer<typeof createStaffUserSchema>;
