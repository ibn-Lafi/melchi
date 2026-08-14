import { notFound } from "next/navigation";
import { Button, Card } from "@system2026/ui";
import { formatCurrency } from "@system2026/utils";
import { getStoreProduct } from "../../../lib/get-catalog";
import { buildWhatsAppOrderLink } from "../../../lib/whatsapp";

export default async function ProductPage({ params }: { params: { id: string } }) {
  const product = await getStoreProduct(params.id);
  if (!product) notFound();

  return (
    <main className="mx-auto max-w-2xl p-4">
      <Card>
        {product.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={product.image_url}
            alt={product.name}
            className="mb-4 aspect-square w-full rounded-xl object-cover"
          />
        ) : null}
        <h1 className="text-2xl font-bold">{product.name}</h1>
        {product.category_name ? (
          <p className="mt-1 text-sm text-muted-foreground">{product.category_name}</p>
        ) : null}
        {product.description ? <p className="mt-4 text-foreground/80">{product.description}</p> : null}
        <p className="mt-4 text-xl font-bold">
          {formatCurrency(product.price)}{" "}
          <span className="text-base font-normal text-muted-foreground">/ {product.base_unit_name}</span>
        </p>
        <a href={buildWhatsAppOrderLink(product.name)} target="_blank" rel="noreferrer">
          <Button className="mt-4 w-full">اطلب الآن عبر واتساب</Button>
        </a>
      </Card>
    </main>
  );
}
