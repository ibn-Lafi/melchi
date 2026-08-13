import { Card } from "@system2026/ui";
import { createSupabaseServerClient } from "@system2026/database/server";

// راجع requirements.md §3.1 — عرض فقط: اسم المحل + المنطقة + رابط الموقع،
// بدون أي بيانات تشغيلية (جوال، دين، ملاحظات). المصدر public_store_locations
// (View مخصص) وليس جدول customers مباشرة.
export default async function PointsOfSalePage() {
  const supabase = createSupabaseServerClient();
  const { data: locations } = await supabase
    .from("public_store_locations")
    .select("*")
    .not("shop_name", "is", null);

  return (
    <main className="mx-auto max-w-3xl p-4">
      <h1 className="mb-4 text-2xl font-bold">نقاط البيع</h1>
      <div className="grid gap-3 sm:grid-cols-2">
        {(locations ?? []).map((location) => (
          <Card key={location.id}>
            <p className="font-semibold">{location.shop_name}</p>
            {location.google_maps_link ? (
              <a
                href={location.google_maps_link}
                target="_blank"
                rel="noreferrer"
                className="mt-2 inline-block text-sm text-primary underline"
              >
                فتح الموقع 📍
              </a>
            ) : null}
          </Card>
        ))}
      </div>
      {(locations?.length ?? 0) === 0 ? (
        <p className="text-foreground/60">لا توجد نقاط بيع معروضة حاليًا</p>
      ) : null}
    </main>
  );
}
