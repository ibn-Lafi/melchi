import { forwardRef } from "react";
import Link, { type LinkProps } from "next/link";
import { cn } from "./cn";
import type { ButtonVariant } from "./button";

const variantClasses: Record<ButtonVariant, string> = {
  default: "bg-primary text-primary-foreground hover:opacity-85 active:opacity-100",
  destructive:
    "border-2 border-primary bg-background text-primary hover:bg-primary hover:text-primary-foreground",
  outline: "border border-border bg-background hover:bg-muted",
};

export interface LinkButtonProps extends LinkProps, React.RefAttributes<HTMLAnchorElement> {
  variant?: ButtonVariant;
  className?: string;
  children?: React.ReactNode;
}

// رابط (Link) بمظهر Button تمامًا — لروابط تنقّل (بدل إجراء نموذج) يجب أن
// تبدو كزر بنفس الصف. يطابق أبعاد/حالات Button حرفيًا (h-11, rounded-xl,
// focus-ring, active:scale) بدل تكرار هذه الأصناف يدويًا بكل صفحة.
export const LinkButton = forwardRef<HTMLAnchorElement, LinkButtonProps>(
  ({ className, variant = "outline", ...props }, ref) => (
    <Link
      ref={ref}
      className={cn(
        "inline-flex h-11 items-center justify-center gap-2 rounded-xl px-5 text-sm font-medium transition-all active:scale-[0.98]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        variantClasses[variant],
        className,
      )}
      {...props}
    />
  ),
);
LinkButton.displayName = "LinkButton";
