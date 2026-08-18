import { LinkButton } from "@system2026/ui";
import type { StorePointOfSale } from "../lib/get-catalog";

export function PointsOfSaleSection({ locations }: { locations: StorePointOfSale[] }) {
  if (locations.length === 0) return null;

  return (
    <section className="mx-auto mt-12 max-w-5xl px-5 lg:mt-16 lg:max-w-6xl lg:px-8 xl:max-w-7xl">
      <h2 className="mb-1.5 text-[19px] font-black lg:text-[22px]">قريب منك دائمًا</h2>
      <p className="mb-5 text-[13.5px] leading-relaxed text-muted-foreground">تصفّح فروعنا وموقعها على الخريطة.</p>
      <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {locations.map((location) => (
          <div
            key={location.id}
            className="flex items-center justify-between gap-3 rounded-[16px] border-[1.5px] border-foreground p-4"
          >
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
    </section>
  );
}
