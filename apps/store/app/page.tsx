import Link from "next/link";
import { getStoreCategories, getStoreProducts } from "../lib/get-catalog";
import { ProductCard } from "../components/product-card";

export default async function HomePage() {
  const [products, categories] = await Promise.all([getStoreProducts(), getStoreCategories()]);

  return (
    <main className="mx-auto max-w-5xl p-4">
      <h1 className="mb-4 text-2xl font-bold">منتجاتنا</h1>

      {categories.length > 0 ? (
        <div className="mb-6 flex flex-wrap gap-2">
          {categories.map((category) => (
            <Link
              key={category.id}
              href={`/category/${category.id}`}
              className="rounded-full border border-border px-3 py-1 text-sm hover:bg-black/5"
            >
              {category.name}
            </Link>
          ))}
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>

      {products.length === 0 ? <p className="text-foreground/60">لا توجد منتجات حاليًا</p> : null}
    </main>
  );
}
