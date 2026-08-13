import Link from "next/link";
import { Card } from "@system2026/ui";
import { formatCurrency } from "@system2026/utils";
import type { StoreProduct } from "../lib/get-catalog";

export function ProductCard({ product }: { product: StoreProduct }) {
  return (
    <Link href={`/product/${product.id}`}>
      <Card className="h-full">
        {product.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={product.image_url}
            alt={product.name}
            className="mb-3 aspect-square w-full rounded-md object-cover"
          />
        ) : (
          <div className="mb-3 aspect-square w-full rounded-md bg-black/5" />
        )}
        <p className="font-semibold">{product.name}</p>
        <p className="mt-1 text-sm text-foreground/60">{product.category_name}</p>
        <p className="mt-2 font-bold text-primary">
          {formatCurrency(product.price)} / {product.base_unit_name}
        </p>
      </Card>
    </Link>
  );
}
