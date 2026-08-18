import Link from "next/link";
import { formatCurrency } from "@system2026/utils";
import { getStoreCategories, getStoreProducts, getStorePointsOfSale } from "../lib/get-catalog";
import { ProductCard, PlaceholderIcon } from "../components/product-card";
import { CategoryPills } from "../components/category-pills";
import { PointsOfSaleSection } from "../components/points-of-sale-section";
import { WaveDivider } from "../components/wave-divider";

export default async function HomePage() {
  const [products, categories, locations] = await Promise.all([
    getStoreProducts(),
    getStoreCategories(),
    getStorePointsOfSale(),
  ]);
  const featured = products[0];

  return (
    <main className="pb-16">
      {/* شريط ترحيبي أسود + فئات */}
      <section className="relative bg-foreground px-5 pb-14 pt-8 text-background lg:px-8 lg:pb-20 lg:pt-14">
        <div className="mx-auto flex max-w-5xl flex-col lg:max-w-6xl lg:flex-row lg:items-center lg:justify-between lg:gap-10 xl:max-w-7xl">
          <div className="max-w-md">
            <span className="text-[12px] font-bold tracking-[0.15em] text-background/60">MELCHI</span>
            <h1 className="mt-2.5 text-[28px] font-black leading-[1.25] lg:text-[42px]">
              كل ما يحتاجه محلك، بضغطة
            </h1>
          </div>
          {categories.length > 0 ? (
            <div className="mt-7 lg:mt-0">
              <CategoryPills categories={categories} variant="dark" />
            </div>
          ) : null}
        </div>
        <WaveDivider position="bottom" fill="white" />
      </section>

      <div className="mx-auto max-w-5xl px-5 lg:max-w-6xl lg:px-8 xl:max-w-7xl">
        {featured ? (
          <section className="pt-6 lg:pt-10">
            <span className="text-[12px] font-extrabold tracking-[0.1em] text-muted-foreground">منتج مميز</span>
            <Link
              href={`/product/${featured.id}`}
              className="mt-3.5 flex items-center gap-4 rounded-[20px] border-[1.5px] border-foreground p-4"
            >
              <div className="flex h-[76px] w-[76px] shrink-0 items-center justify-center overflow-hidden rounded-[14px] bg-muted">
                {featured.image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={featured.image_url} alt={featured.name} className="h-full w-full object-cover" />
                ) : (
                  <PlaceholderIcon />
                )}
              </div>
              <div className="flex-1">
                <p className="text-[15px] font-extrabold">{featured.name}</p>
                <p className="text-xs text-muted-foreground">/ {featured.base_unit_name}</p>
                <p className="mt-1 text-[17px] font-black">{formatCurrency(featured.price)}</p>
              </div>
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-foreground text-background">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M15 6l-6 6 6 6" />
                </svg>
              </span>
            </Link>
          </section>
        ) : null}

        <h2 className="mb-4 mt-10 text-[19px] font-black lg:mt-14 lg:text-[22px]">كل المنتجات</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 lg:gap-6 xl:grid-cols-5">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>

        {products.length === 0 ? (
          <p className="py-12 text-center text-muted-foreground">لا توجد منتجات حاليًا</p>
        ) : null}
      </div>

      <PointsOfSaleSection locations={locations} />
    </main>
  );
}
