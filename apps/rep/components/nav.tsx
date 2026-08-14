"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@system2026/ui";

const NAV_ITEMS = [
  { href: "/route", label: "خط السير" },
  { href: "/invoice/new", label: "فاتورة جديدة" },
  { href: "/collections", label: "التحصيلات" },
  { href: "/returns", label: "المرتجعات" },
];

export function AppNav() {
  const pathname = usePathname();

  return (
    <nav className="no-print sticky top-0 z-10 border-b border-border bg-background/80 backdrop-blur">
      <div className="flex gap-1.5 overflow-x-auto p-3 scrollbar-none">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname?.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-foreground/70 hover:text-foreground",
              )}
            >
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
