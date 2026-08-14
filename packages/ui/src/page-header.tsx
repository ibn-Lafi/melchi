import { type ReactNode } from "react";
import { cn } from "./cn";

export function PageHeader({
  breadcrumb,
  title,
  subtitle,
  actions,
  className,
}: {
  breadcrumb?: ReactNode;
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mb-6", className)}>
      {breadcrumb ? (
        <div className="mb-2 flex items-center gap-1.5 text-sm text-muted-foreground">{breadcrumb}</div>
      ) : null}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{title}</h1>
          {subtitle ? <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p> : null}
        </div>
        {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
      </div>
    </div>
  );
}

export function Breadcrumb({ items }: { items: string[] }) {
  return (
    <>
      {items.map((item, i) => (
        <span key={item} className="flex items-center gap-1.5">
          {i > 0 ? <span className="text-foreground/30">/</span> : null}
          <span className={i === items.length - 1 ? "text-foreground" : ""}>{item}</span>
        </span>
      ))}
    </>
  );
}
