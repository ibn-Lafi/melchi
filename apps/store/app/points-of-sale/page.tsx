import { LinkButton } from "@system2026/ui";
import { getStorePointsOfSale } from "../../lib/get-catalog";

export default async function PointsOfSalePage() {
  const locations = await getStorePointsOfSale();

  return (
    <main className="mx-auto max-w-3xl px-5 pb-16 pt-6 lg:px-8 lg:pt-10">
      <h1 className="mb-6 text-[24px] font-black tracking-tight lg:text-[28px]">نقاط البيع</h1>
      {locations.length === 0 ? (
        <p className="text-muted-foreground">لا توجد نقاط بيع معروضة حاليًا</p>
      ) : (
        <div className="grid gap-3.5 sm:grid-cols-2">
          {locations.map((location) => (
            <div key={location.id} className="flex items-center justify-between gap-3 rounded-[16px] border-[1.5px] border-foreground p-4">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-[1.5px] border-foreground/25 text-foreground">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M12 22s7-6.2 7-12.4A7 7 0 0 0 5 9.6C5 15.8 12 22 12 22Z" />
                    <circle cx="12" cy="9.6" r="2.4" />
                  </svg>
                </span>
                <p className="text-[14px] font-bold">{location.shop_name}</p>
              </div>
              {location.google_maps_link ? (
                <LinkButton href={location.google_maps_link} target="_blank" rel="noreferrer" variant="outline" size="sm">
                  فتح الموقع
                </LinkButton>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
