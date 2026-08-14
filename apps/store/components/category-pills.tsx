"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@system2026/ui";

type Category = { id: string; name: string };

export function CategoryPills({ categories }: { categories: Category[] }) {
  const pathname = usePathname();

  return (
    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
      <Link
        href="/"
        className={cn(
          "shrink-0 rounded-full border px-4 py-2 text-sm font-medium transition-colors",
          pathname === "/"
            ? "border-primary bg-primary text-primary-foreground"
            : "border-border bg-background text-foreground/70 hover:bg-muted",
        )}
      >
        الكل
      </Link>
      {categories.map((category) => {
        const href = `/category/${category.id}`;
        const isActive = pathname === href;
        return (
          <Link
            key={category.id}
            href={href}
            className={cn(
              "shrink-0 rounded-full border px-4 py-2 text-sm font-medium transition-colors",
              isActive
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-background text-foreground/70 hover:bg-muted",
            )}
          >
            {category.name}
          </Link>
        );
      })}
    </div>
  );
}
