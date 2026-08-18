"use client";

import { useMemo, useState } from "react";
import { LinkButton } from "@system2026/ui";
import type { StorePointOfSale } from "../lib/get-catalog";

export function PointsOfSaleList({
  locations,
  gridClassName = "sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4",
}: {
  locations: StorePointOfSale[];
  gridClassName?: string;
}) {
  const cities = useMemo(() => {
    const set = new Set<string>();
    for (const location of locations) {
      if (location.city_name) set.add(location.city_name);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, "ar"));
  }, [locations]);

  const [activeCity, setActiveCity] = useState<string | null>(null);

  if (locations.length === 0) {
    return <p className="text-muted-foreground">لا توجد نقاط بيع معروضة حاليًا</p>;
  }

  const filtered = activeCity ? locations.filter((location) => location.city_name === activeCity) : locations;

  return (
    <div>
      {cities.length > 1 ? (
        <div className="mb-5 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setActiveCity(null)}
            className={`h-9 rounded-full border-[1.5px] px-4 text-[13px] font-bold transition-colors ${
              activeCity === null ? "border-foreground bg-foreground text-background" : "border-border text-muted-foreground"
            }`}
          >
            الكل
          </button>
          {cities.map((city) => (
            <button
              key={city}
              type="button"
              onClick={() => setActiveCity(city)}
              className={`h-9 rounded-full border-[1.5px] px-4 text-[13px] font-bold transition-colors ${
                activeCity === city ? "border-foreground bg-foreground text-background" : "border-border text-muted-foreground"
              }`}
            >
              {city}
            </button>
          ))}
        </div>
      ) : null}

      {filtered.length === 0 ? (
        <p className="text-muted-foreground">لا توجد نقاط بيع بهذه المدينة</p>
      ) : (
        <div className={`grid gap-3.5 ${gridClassName}`}>
          {filtered.map((location) => (
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
                <div>
                  <p className="text-[14px] font-bold">{location.shop_name}</p>
                  {location.city_name ? <p className="text-[11.5px] text-muted-foreground">{location.city_name}</p> : null}
                </div>
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
    </div>
  );
}
