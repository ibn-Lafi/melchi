import { type HTMLAttributes } from "react";
import { cn } from "./cn";

export type BadgeVariant = "default" | "success" | "warning" | "danger" | "muted";

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

// الألوان محصورة أبيض/أسود حسب قيد الهوية البصرية المؤقت (راجع CLAUDE.md) —
// التمييز بين الحالات يتم بالحدود والامتلاء (outline/solid/muted) بدل الدرجة اللونية.
const variantClasses: Record<BadgeVariant, string> = {
  default: "bg-primary text-primary-foreground",
  success: "border border-foreground/20 bg-background text-foreground",
  warning: "border border-dashed border-foreground/30 bg-background text-foreground/80",
  danger: "border-2 border-foreground bg-background text-foreground",
  muted: "bg-muted text-muted-foreground",
};

export function Badge({ className, variant = "muted", ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium leading-none",
        variantClasses[variant],
        className,
      )}
      {...props}
    />
  );
}
