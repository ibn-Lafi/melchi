import { getStoreCategories, getStoreProducts } from "../lib/get-catalog";
import { ProductCard } from "../components/product-card";
import { CategoryPills } from "../components/category-pills";

export default async function HomePage() {
  const [products, categories] = await Promise.all([getStoreProducts(), getStoreCategories()]);

  return (
    <main className="mx-auto max-w-5xl p-4">
      <h1 className="mb-5 text-2xl font-bold">منتجاتنا</h1>

      {categories.length > 0 ? (
        <div className="mb-6">
          <CategoryPills categories={categories} />
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>

      {products.length === 0 ? (
        <p className="py-12 text-center text-muted-foreground">لا توجد منتجات حاليًا</p>
      ) : null}
    </main>
  );
}
