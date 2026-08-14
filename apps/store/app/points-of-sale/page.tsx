import { getStorePointsOfSale } from "../../lib/get-catalog";

export default async function PointsOfSalePage() {
  const locations = await getStorePointsOfSale();

  return (
    <main className="mx-auto max-w-3xl p-4">
      <h1 className="mb-4 text-2xl font-bold">نقاط البيع</h1>
      {locations.length === 0 ? (
        <p className="text-foreground/60">لا توجد نقاط بيع معروضة حاليًا</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {locations.map((location) => (
            <div key={location.id} className="rounded-2xl border border-border p-5">
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
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
