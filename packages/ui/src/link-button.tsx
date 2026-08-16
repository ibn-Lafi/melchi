import { forwardRef, type AnchorHTMLAttributes } from "react";
import Link, { type LinkProps } from "next/link";
import { cn } from "./cn";
import type { ButtonSize, ButtonVariant } from "./button";

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

export interface LinkButtonProps
  extends LinkProps,
    Omit<AnchorHTMLAttributes<HTMLAnchorElement>, keyof LinkProps | "href">,
    React.RefAttributes<HTMLAnchorElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
  children?: React.ReactNode;
}

// رابط (Link) بمظهر Button تمامًا — لروابط تنقّل (بدل إجراء نموذج) يجب أن
// تبدو كزر بنفس الصف. يطابق أبعاد/حالات Button حرفيًا (h-11/h-9، rounded-xl/full،
// focus-ring, active:scale) بدل تكرار هذه الأصناف يدويًا بكل صفحة.
export const LinkButton = forwardRef<HTMLAnchorElement, LinkButtonProps>(
  ({ className, variant = "outline", size = "md", ...props }, ref) => (
    <Link
      ref={ref}
      className={cn(
        "inline-flex items-center justify-center gap-2 font-medium transition-all active:scale-[0.98]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        sizeClasses[size],
        variantClasses[variant],
        className,
      )}
      {...props}
    />
  ),
);
LinkButton.displayName = "LinkButton";
