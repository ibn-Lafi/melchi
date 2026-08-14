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
    <main className="mx-auto max-w-5xl p-4 lg:max-w-6xl lg:p-6 xl:max-w-7xl">
      <h1 className="mb-5 text-2xl font-bold lg:text-3xl">منتجاتنا</h1>

      {categories.length > 0 ? (
        <div className="mb-6 lg:mb-8">
          <CategoryPills categories={categories} />
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
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
