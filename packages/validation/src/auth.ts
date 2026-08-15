import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("بريد إلكتروني غير صالح"),
  password: z.string().min(6, "كلمة المرور يجب أن تكون 6 أحرف على الأقل"),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const createStaffUserSchema = z.object({
  name: z.string().min(1, "الاسم مطلوب"),
  email: z.string().email("بريد إلكتروني غير صالح"),
  phone: z.string().optional(),
  password: z.string().min(6, "كلمة المرور يجب أن تكون 6 أحرف على الأقل"),
  role: z.enum(["admin", "accountant", "rep", "marketing", "sales", "production", "supervisor"]),
});

export type CreateStaffUserInput = z.infer<typeof createStaffUserSchema>;

export const changeUserRoleSchema = z.object({
  userId: z.string().uuid(),
  role: z.enum(["accountant", "marketing", "sales", "production", "supervisor"]),
});

export const changeUserPasswordSchema = z.object({
  userId: z.string().uuid(),
  password: z.string().min(6, "كلمة المرور يجب أن تكون 6 أحرف على الأقل"),
});

export const updateOwnNameSchema = z.object({
  name: z.string().min(1, "الاسم مطلوب"),
});

export const updateOwnPasswordSchema = z.object({
  password: z.string().min(6, "كلمة المرور يجب أن تكون 6 أحرف على الأقل"),
});
