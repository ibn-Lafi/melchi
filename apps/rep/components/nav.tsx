"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@system2026/ui";

const NAV_ITEMS = [
  { href: "/route", label: "خط السير", icon: HomeIcon },
  { href: "/collections", label: "التحصيلات", icon: WalletIcon },
  { href: "/returns", label: "المرتجعات", icon: ReturnIcon },
];

const CREATE_ITEM = { href: "/invoice/new", label: "فاتورة جديدة" };

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

type IconComponent = (p: { className?: string }) => JSX.Element;

function MobileNavLink({
  href,
  label,
  icon: Icon,
  isActive,
}: {
  href: string;
  label: string;
  icon: IconComponent;
  isActive: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "flex flex-1 flex-col items-center gap-0.5 whitespace-nowrap rounded-2xl py-1.5 text-[11px] font-medium leading-tight",
        isActive ? "text-primary" : "text-muted-foreground",
      )}
    >
      <Icon className="h-5 w-5 shrink-0" />
      <span>{label}</span>
    </Link>
  );
}

function DesktopNavLink({
  href,
  label,
  icon: Icon,
  isActive,
}: {
  href: string;
  label: string;
  icon: IconComponent;
  isActive: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-2 whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition-colors",
        isActive ? "bg-primary text-primary-foreground" : "text-foreground/70 hover:bg-muted",
      )}
    >
      <Icon className="h-4 w-4 shrink-0" />
      <span>{label}</span>
    </Link>
  );
}

export function AppNav() {
  const pathname = usePathname();
  const isItemActive = (href: string) => pathname?.startsWith(href) ?? false;

  return (
    <>
      {/* شريط عائم للجوال — نفس نمط تطبيقات التوصيل بزر إجراء دائري مرتفع بالمنتصف */}
      <nav className="no-print fixed inset-x-3 bottom-3 z-20 sm:hidden">
        <div className="relative flex items-stretch justify-between rounded-[28px] border border-border bg-background px-2 py-1.5 shadow-pop">
          <div className="flex flex-1 items-center justify-evenly">
            <MobileNavLink {...NAV_ITEMS[0]!} isActive={isItemActive(NAV_ITEMS[0]!.href)} />
            <MobileNavLink {...NAV_ITEMS[1]!} isActive={isItemActive(NAV_ITEMS[1]!.href)} />
          </div>

          <div className="w-14 shrink-0" />

          <div className="flex flex-1 items-center justify-evenly">
            <MobileNavLink {...NAV_ITEMS[2]!} isActive={isItemActive(NAV_ITEMS[2]!.href)} />
          </div>

          <Link
            href={CREATE_ITEM.href}
            aria-label={CREATE_ITEM.label}
            className="absolute inset-x-0 -top-7 mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-pop transition-transform active:scale-95"
          >
            <PlusIcon className="h-6 w-6" />
          </Link>
        </div>
      </nav>

      {/* شريط علوي لعرض الكمبيوتر/التابلت — الشريط العائم الصغير لا يناسب شاشة واسعة */}
      <nav className="no-print sticky top-0 z-20 hidden border-b border-border bg-background/95 backdrop-blur sm:block">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-1">
            {NAV_ITEMS.map((item) => (
              <DesktopNavLink key={item.href} {...item} isActive={isItemActive(item.href)} />
            ))}
          </div>
          <Link
            href={CREATE_ITEM.href}
            className="flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-85"
          >
            <PlusIcon className="h-4 w-4" />
            {CREATE_ITEM.label}
          </Link>
        </div>
      </nav>
    </>
  );
}
