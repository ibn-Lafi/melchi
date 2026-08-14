import Link from "next/link";
import { Card } from "@system2026/ui";
import { formatCurrency } from "@system2026/utils";
import type { StoreProduct } from "../lib/get-catalog";

export function ProductCard({ product }: { product: StoreProduct }) {
  return (
    <Link href={`/product/${product.id}`}>
      <Card className="h-full p-3 hover:shadow-card-hover">
        {product.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={product.image_url}
            alt={product.name}
            className="mb-3 aspect-square w-full rounded-xl object-cover"
          />
        ) : (
          <div className="mb-3 aspect-square w-full rounded-xl bg-muted" />
        )}
        <p className="px-0.5 font-semibold">{product.name}</p>
        <p className="px-0.5 text-sm text-muted-foreground">{product.category_name}</p>
        <p className="px-0.5 pt-2 font-bold">
          {formatCurrency(product.price)} <span className="font-normal text-muted-foreground">/ {product.base_unit_name}</span>
        </p>
      </Card>
    </Link>
  );
}
