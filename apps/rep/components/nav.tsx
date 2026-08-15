"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@system2026/ui";

const SIDE_ITEMS_RIGHT = [
  { href: "/", label: "الرئيسية", icon: HomeIcon },
  { href: "/invoices", label: "الفواتير", icon: InvoiceIcon },
];

const SIDE_ITEMS_LEFT = [
  { href: "/route", label: "العملاء", icon: UsersIcon },
  { href: "/account", label: "حسابي", icon: PersonIcon },
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

function InvoiceIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M6 3h12v18l-3-2-3 2-3-2-3 2V3Z" />
      <path d="M9 8h6M9 12h6" />
    </svg>
  );
}

function UsersIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <circle cx="9" cy="8" r="3" />
      <path d="M3.5 20c0-3 2.5-5.5 5.5-5.5s5.5 2.5 5.5 5.5" />
      <circle cx="17.5" cy="8.5" r="2.3" />
      <path d="M15.8 14.7c2.4.4 4.2 2.5 4.2 5" />
    </svg>
  );
}

function PersonIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <circle cx="12" cy="8" r="3.5" />
      <path d="M4.5 20c0-4.1 3.4-7.5 7.5-7.5s7.5 3.4 7.5 7.5" />
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

function NavLink({
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
        "flex flex-1 flex-col items-center gap-1 whitespace-nowrap rounded-2xl py-1.5 text-[10px] font-medium leading-tight",
        isActive ? "text-primary" : "text-muted-foreground",
      )}
    >
      <span
        className={cn(
          "flex h-7 w-9 items-center justify-center rounded-full transition-colors",
          isActive ? "bg-muted" : "",
        )}
      >
        <Icon className="h-5 w-5 shrink-0" />
      </span>
      <span>{label}</span>
    </Link>
  );
}

// تطبيق المندوب يُستخدم حصرًا عن طريق الجوال ميدانيًا — شريط تنقل واحد
// عائم بنفس التصميم بغض النظر عن عرض الشاشة (لا تبديل حسب breakpoint).
export function AppNav() {
  const pathname = usePathname();
  const isItemActive = (href: string) => (href === "/" ? pathname === "/" : pathname?.startsWith(href) ?? false);

  return (
    <nav className="no-print fixed inset-x-3 bottom-3 z-20 mx-auto max-w-sm">
      <div className="relative flex items-stretch justify-between rounded-[28px] border border-border bg-background px-1.5 py-1.5 shadow-pop">
        <div className="flex flex-1 items-center justify-evenly">
          {SIDE_ITEMS_RIGHT.map((item) => (
            <NavLink key={item.href} {...item} isActive={isItemActive(item.href)} />
          ))}
        </div>

        <div className="w-14 shrink-0" />

        <div className="flex flex-1 items-center justify-evenly">
          {SIDE_ITEMS_LEFT.map((item) => (
            <NavLink key={item.href} {...item} isActive={isItemActive(item.href)} />
          ))}
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
  );
}
