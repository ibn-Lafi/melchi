import { getStoreCategories, getStoreProducts, getStorePointsOfSale } from "../lib/get-catalog";
import { ProductCard } from "../components/product-card";
import { CategoryPills } from "../components/category-pills";
import { PointsOfSaleSection } from "../components/points-of-sale-section";

export default async function HomePage() {
  const [products, categories, locations] = await Promise.all([
    getStoreProducts(),
    getStoreCategories(),
    getStorePointsOfSale(),
  ]);

  return (
    <main className="mx-auto max-w-5xl px-5 pb-16 pt-6 lg:max-w-6xl lg:px-8 lg:pt-10 xl:max-w-7xl">
      <h1 className="mb-1 text-[24px] font-extrabold tracking-tight lg:text-[32px]">منتجاتنا</h1>

      {categories.length > 0 ? (
        <div className="mb-6 mt-5 lg:mb-8 lg:mt-8">
          <CategoryPills categories={categories} />
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 lg:gap-6 xl:grid-cols-5">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>

      {products.length === 0 ? (
        <p className="py-12 text-center text-muted-foreground">لا توجد منتجات حاليًا</p>
      ) : null}

      <PointsOfSaleSection locations={locations} />
    </main>
  );
}
