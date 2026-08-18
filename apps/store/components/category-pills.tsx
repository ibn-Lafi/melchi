"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@system2026/ui";
import type { StoreCategory } from "../lib/get-catalog";

function GridIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3.5" y="3.5" width="7" height="7" rx="1.5" />
      <rect x="13.5" y="3.5" width="7" height="7" rx="1.5" />
      <rect x="3.5" y="13.5" width="7" height="7" rx="1.5" />
      <rect x="13.5" y="13.5" width="7" height="7" rx="1.5" />
    </svg>
  );
}

function CategoryAvatar({
  href,
  isActive,
  label,
  imageUrl,
  isAll,
}: {
  href: string;
  isActive: boolean;
  label: string;
  imageUrl: string | null;
  isAll?: boolean;
}) {
  return (
    <Link href={href} className="flex shrink-0 flex-col items-center gap-2 lg:gap-2.5">
      <span
        className={cn(
          "flex h-[68px] w-[68px] items-center justify-center overflow-hidden rounded-full transition-all lg:h-[84px] lg:w-[84px]",
          isActive && isAll
            ? "bg-primary text-primary-foreground ring-2 ring-offset-2 ring-offset-background ring-primary"
            : isActive
              ? "bg-muted ring-2 ring-offset-2 ring-offset-background ring-primary"
              : "bg-muted text-muted-foreground",
        )}
      >
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imageUrl} alt={label} className="h-full w-full object-cover" />
        ) : isAll ? (
          <GridIcon />
        ) : (
          <span className="text-[13px] font-semibold">{label.slice(0, 1)}</span>
        )}
      </span>
      <span
        className={cn(
          "max-w-[4.75rem] truncate text-[12.5px] lg:max-w-[6rem] lg:text-sm",
          isActive ? "font-bold text-foreground" : "font-medium text-muted-foreground",
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
    <div className="flex gap-5 overflow-x-auto pb-1 scrollbar-none lg:flex-wrap lg:overflow-visible lg:gap-8">
      <CategoryAvatar href="/" isActive={pathname === "/"} label="الكل" imageUrl={null} isAll />
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
