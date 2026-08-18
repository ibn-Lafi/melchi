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
    <main className="mx-auto max-w-5xl px-5 pb-16 pt-6 lg:max-w-6xl lg:px-8 lg:pt-10 xl:max-w-7xl">
      <h1 className="mb-1 text-[24px] font-black tracking-tight lg:text-[32px]">{category?.name ?? "الفئة"}</h1>

      <div className="mb-6 mt-5 lg:mb-8 lg:mt-8">
        <CategoryPills categories={categories} />
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 lg:gap-6 xl:grid-cols-5">
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
