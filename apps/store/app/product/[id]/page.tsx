import { notFound } from "next/navigation";
import Link from "next/link";
import { formatCurrency } from "@system2026/utils";
import { getStoreProduct } from "../../../lib/get-catalog";
import { buildWhatsAppOrderLink } from "../../../lib/whatsapp";

function PlaceholderIcon() {
  return (
    <svg
      width="88"
      height="88"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.1"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="text-muted-foreground/50"
      aria-hidden="true"
    >
      <path d="M21 8.5 12 4 3 8.5 12 13l9-4.5Z" />
      <path d="M3 8.5V16l9 4.5 9-4.5V8.5" />
      <path d="M12 13v7.5" />
    </svg>
  );
}

export default async function ProductPage({ params }: { params: { id: string } }) {
  const product = await getStoreProduct(params.id);
  if (!product) notFound();

  return (
    <main className="mx-auto max-w-2xl pb-28">
      {/* الصورة الرئيسية */}
      <div className="relative aspect-[4/5] w-full overflow-hidden rounded-b-[32px] bg-muted sm:aspect-[16/10]">
        {product.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={product.image_url} alt={product.name} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <PlaceholderIcon />
          </div>
        )}

        <Link
          href="/"
          aria-label="العودة للمتجر"
          className="absolute end-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-background/85 text-foreground shadow-[0_4px_12px_hsl(20_10%_15%/0.12)] backdrop-blur"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M9 6l6 6-6 6" />
          </svg>
        </Link>

        {product.category_name ? (
          <span className="absolute bottom-4 end-4 rounded-full bg-background/90 px-3.5 py-1.5 text-[12.5px] font-semibold text-foreground backdrop-blur">
            {product.category_name}
          </span>
        ) : null}
      </div>

      {/* بطاقة المحتوى */}
      <div className="-mt-6 flex flex-col gap-4 rounded-t-[28px] bg-background px-5 pt-7 sm:mt-0 sm:rounded-none sm:px-6 sm:pt-8">
        <div className="flex flex-col gap-2">
          <h1 className="text-[24px] font-extrabold leading-snug tracking-tight">{product.name}</h1>
          <span className="w-fit rounded-full bg-primary/10 px-3 py-1.5 text-[12.5px] font-bold text-primary">
            الوحدة: {product.base_unit_name}
          </span>
        </div>

        {product.description ? (
          <p className="text-[14.5px] leading-[1.85] text-foreground/80">{product.description}</p>
        ) : null}

        <div className="h-px w-full bg-border" />

        <div className="flex items-baseline gap-1.5">
          <span className="text-[28px] font-extrabold">{formatCurrency(product.price)}</span>
          <span className="text-[13.5px] text-muted-foreground">/ {product.base_unit_name}</span>
        </div>
      </div>

      {/* شريط الطلب الثابت */}
      <div className="fixed inset-x-0 bottom-0 z-10 border-t border-border bg-background/95 px-5 pb-[calc(1.1rem+env(safe-area-inset-bottom))] pt-3.5 shadow-[0_-8px_20px_hsl(20_10%_15%/0.05)] backdrop-blur">
        <div className="mx-auto max-w-2xl">
          <a href={buildWhatsAppOrderLink(product.name)} target="_blank" rel="noreferrer" className="block">
            <span className="flex h-[52px] items-center justify-center gap-2.5 rounded-full bg-primary text-[15px] font-bold text-primary-foreground transition-opacity active:opacity-90">
              <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M4 20l1.4-4.2A8 8 0 1 1 8.8 19L4 20Z" />
                <path d="M9 10.2c0 2.6 2.2 4.8 4.8 4.8" />
              </svg>
              <span>اطلب عبر واتساب</span>
            </span>
          </a>
        </div>
      </div>
    </main>
  );
}
