import { type ButtonHTMLAttributes, forwardRef } from "react";
import { cn } from "./cn";

export type ButtonVariant = "default" | "destructive" | "outline";
// sm: نفس مقاس شرائح التبديل الصغيرة المستخدمة عبر الجداول (أرشفة/تفعيل/إيقاف)
// — لضمان أن أزرار "تعديل" المجاورة لها بنفس الصف لا تبدو أكبر منها.
export type ButtonSize = "md" | "sm";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

const variantClasses: Record<ButtonVariant, string> = {
  default: "bg-primary text-primary-foreground hover:opacity-85 active:opacity-100",
  destructive:
    "border-2 border-primary bg-background text-primary hover:bg-primary hover:text-primary-foreground",
  outline: "border border-border bg-background hover:bg-muted",
};

const sizeClasses: Record<ButtonSize, string> = {
  md: "h-11 rounded-xl px-5 text-sm",
  sm: "h-9 rounded-full px-3.5 text-xs",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "md", ...props }, ref) => (
    <button
      ref={ref}
      className={cn(
        "inline-flex items-center justify-center gap-2 font-medium transition-all active:scale-[0.98] disabled:pointer-events-none disabled:opacity-40",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        sizeClasses[size],
        variantClasses[variant],
        className,
      )}
      {...props}
    />
  ),
);
Button.displayName = "Button";
