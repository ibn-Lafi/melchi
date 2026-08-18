import Link from "next/link";
import { formatCurrency } from "@system2026/utils";
import type { StoreProduct } from "../lib/get-catalog";

export function PlaceholderIcon() {
  return (
    <svg
      width="40"
      height="40"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.3"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="text-muted-foreground/60"
      aria-hidden="true"
    >
      <path d="M21 8.5 12 4 3 8.5 12 13l9-4.5Z" />
      <path d="M3 8.5V16l9 4.5 9-4.5V8.5" />
      <path d="M12 13v7.5" />
    </svg>
  );
}

export function ProductCard({ product }: { product: StoreProduct }) {
  return (
    <Link href={`/product/${product.id}`} className="group flex flex-col gap-2.5">
      <div className="relative aspect-[4/5] w-full overflow-hidden rounded-[18px] border border-border bg-muted transition-transform group-active:scale-[0.98]">
        {product.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={product.image_url} alt={product.name} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <PlaceholderIcon />
          </div>
        )}
      </div>
      <div className="flex flex-col gap-0.5 px-0.5">
        <p className="line-clamp-2 text-[14px] font-extrabold leading-snug">{product.name}</p>
        <p className="text-xs text-muted-foreground">/ {product.base_unit_name}</p>
        <p className="mt-1 text-[16px] font-black">{formatCurrency(product.price)}</p>
      </div>
    </Link>
  );
}
