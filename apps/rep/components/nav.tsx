"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@system2026/ui";

const SIDE_ITEMS_RIGHT = [{ href: "/route", label: "خط السير", icon: HomeIcon }, { href: "/collections", label: "التحصيلات", icon: WalletIcon }];
const SIDE_ITEMS_LEFT = [{ href: "/returns", label: "المرتجعات", icon: ReturnIcon }];
const CENTER_ITEM = { href: "/invoice/new", label: "فاتورة" };

function HomeIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M3 10.5 12 3l9 7.5" />
      <path d="M5 9.5V21h14V9.5" />
      <path d="M9.5 21v-6h5v6" />
    </svg>
  );
}

function WalletIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <rect x="3" y="6" width="18" height="13" rx="2.5" />
      <path d="M3 10h18" />
      <path d="M15 14.5h3" />
    </svg>
  );
}

function ReturnIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M4 12a8 8 0 1 0 3-6.2" />
      <path d="M4 4v5h5" />
    </svg>
  );
}

function PlusIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

function NavLink({ href, label, icon: Icon, isActive }: { href: string; label: string; icon: (p: { className?: string }) => JSX.Element; isActive: boolean }) {
  return (
    <Link
      href={href}
      className={cn(
        "flex flex-1 flex-col items-center gap-0.5 rounded-2xl py-1.5 text-[11px] font-medium transition-colors",
        isActive ? "text-primary" : "text-muted-foreground",
      )}
    >
      <Icon className="h-5 w-5" />
      {label}
    </Link>
  );
}

export function AppNav() {
  const pathname = usePathname();

  return (
    <nav className="no-print fixed inset-x-3 bottom-3 z-20 sm:inset-x-0 sm:mx-auto sm:max-w-sm">
      <div className="relative flex items-center rounded-[28px] border border-border bg-background/95 px-2 py-1.5 shadow-pop backdrop-blur">
        <div className="flex flex-1 items-center gap-1">
          {SIDE_ITEMS_RIGHT.map((item) => (
            <NavLink key={item.href} {...item} isActive={pathname?.startsWith(item.href) ?? false} />
          ))}
        </div>

        <div className="w-14 shrink-0" />

        <div className="flex flex-1 items-center gap-1">
          {SIDE_ITEMS_LEFT.map((item) => (
            <NavLink key={item.href} {...item} isActive={pathname?.startsWith(item.href) ?? false} />
          ))}
        </div>

        <Link
          href={CENTER_ITEM.href}
          aria-label={CENTER_ITEM.label}
          className="absolute inset-x-0 -top-7 mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-pop transition-transform active:scale-95"
        >
          <PlusIcon className="h-6 w-6" />
        </Link>
      </div>
    </nav>
  );
}
