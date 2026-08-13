import Link from "next/link";

const NAV_ITEMS = [
  { href: "/route", label: "خط السير" },
  { href: "/invoice/new", label: "فاتورة جديدة" },
  { href: "/collections", label: "التحصيلات" },
  { href: "/returns", label: "المرتجعات" },
];

export function AppNav() {
  return (
    <nav className="flex gap-2 border-b border-border p-3">
      {NAV_ITEMS.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className="rounded-md px-3 py-2 text-sm font-medium hover:bg-black/5"
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
