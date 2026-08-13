import { getStoreCategories, getStoreProducts } from "../../../lib/get-catalog";
import { ProductCard } from "../../../components/product-card";

// slug هنا = معرّف الفئة (categories.id) — لا يوجد عمود slug منفصل بالمخطط حاليًا
export default async function CategoryPage({ params }: { params: { slug: string } }) {
  const [products, categories] = await Promise.all([
    getStoreProducts(params.slug),
    getStoreCategories(),
  ]);
  const category = categories.find((c) => c.id === params.slug);

  return (
    <main className="mx-auto max-w-5xl p-4">
      <h1 className="mb-4 text-2xl font-bold">{category?.name ?? "الفئة"}</h1>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
      {products.length === 0 ? <p className="text-foreground/60">لا توجد منتجات بهذه الفئة</p> : null}
    </main>
  );
}
