import { getStoreCategories, getStoreProducts } from "../../../lib/get-catalog";
import { ProductCard } from "../../../components/product-card";
import { CategoryPills } from "../../../components/category-pills";

// slug هنا = معرّف الفئة (categories.id) — لا يوجد عمود slug منفصل بالمخطط حاليًا
export default async function CategoryPage({ params }: { params: { slug: string } }) {
  const [products, categories] = await Promise.all([
    getStoreProducts(params.slug),
    getStoreCategories(),
  ]);
  const category = categories.find((c) => c.id === params.slug);

  return (
    <main className="mx-auto max-w-5xl p-4">
      <h1 className="mb-5 text-2xl font-bold">{category?.name ?? "الفئة"}</h1>

      <div className="mb-6">
        <CategoryPills categories={categories} />
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
      {products.length === 0 ? (
        <p className="py-12 text-center text-muted-foreground">لا توجد منتجات بهذه الفئة</p>
      ) : null}
    </main>
  );
}
