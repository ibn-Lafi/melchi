"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@system2026/ui";
import type { StoreCategory } from "../lib/get-catalog";

function CategoryAvatar({
  href,
  isActive,
  label,
  imageUrl,
}: {
  href: string;
  isActive: boolean;
  label: string;
  imageUrl: string | null;
}) {
  return (
    <Link href={href} className="flex shrink-0 flex-col items-center gap-1.5 lg:gap-2">
      <span
        className={cn(
          "flex h-16 w-16 items-center justify-center overflow-hidden rounded-full border-2 bg-muted transition-colors lg:h-20 lg:w-20",
          isActive ? "border-foreground" : "border-transparent",
        )}
      >
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imageUrl} alt={label} className="h-full w-full object-cover" />
        ) : (
          <span className="text-xs font-medium text-foreground/60 lg:text-sm">{label}</span>
        )}
      </span>
      <span
        className={cn(
          "max-w-[4.5rem] truncate text-xs lg:max-w-[5.5rem] lg:text-sm",
          isActive ? "font-semibold text-foreground" : "text-foreground/70",
        )}
      >
        {label}
      </span>
    </Link>
  );
}

export function CategoryPills({ categories }: { categories: StoreCategory[] }) {
  const pathname = usePathname();

  return (
    <div className="flex gap-4 overflow-x-auto pb-1 scrollbar-none lg:flex-wrap lg:overflow-visible lg:gap-6">
      <CategoryAvatar href="/" isActive={pathname === "/"} label="الكل" imageUrl={null} />
      {categories.map((category) => {
        const href = `/category/${category.id}`;
        return (
          <CategoryAvatar
            key={category.id}
            href={href}
            isActive={pathname === href}
            label={category.name}
            imageUrl={category.image_url}
          />
        );
      })}
    </div>
  );
}
