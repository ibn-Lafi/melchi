"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (locations.length === 0) {
    return <p className="text-muted-foreground">لا توجد نقاط بيع معروضة حاليًا</p>;
  }

  const filtered = activeCity ? locations.filter((location) => location.city_name === activeCity) : locations;

  return (
    <div>
      {cities.length > 0 ? (
        <div ref={wrapperRef} className="relative mb-5 inline-block">
          <button
            type="button"
            onClick={() => setIsOpen((prev) => !prev)}
            className="flex h-10 items-center gap-2 rounded-full border-[1.5px] border-foreground px-4 text-[13px] font-bold"
          >
            <span>{activeCity ?? "الكل"}</span>
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className={`transition-transform ${isOpen ? "rotate-180" : ""}`}
              aria-hidden="true"
            >
              <path d="M6 9l6 6 6-6" />
            </svg>
          </button>

          {isOpen ? (
            <div className="absolute top-[calc(100%+8px)] z-10 min-w-[160px] overflow-hidden rounded-[14px] border-[1.5px] border-foreground bg-background">
              <button
                type="button"
                onClick={() => {
                  setActiveCity(null);
                  setIsOpen(false);
                }}
                className={`block w-full px-4 py-2.5 text-start text-[13px] font-bold transition-colors hover:bg-muted ${
                  activeCity === null ? "bg-foreground text-background hover:bg-foreground" : ""
                }`}
              >
                الكل
              </button>
              {cities.map((city) => (
                <button
                  key={city}
                  type="button"
                  onClick={() => {
                    setActiveCity(city);
                    setIsOpen(false);
                  }}
                  className={`block w-full px-4 py-2.5 text-start text-[13px] font-bold transition-colors hover:bg-muted ${
                    activeCity === city ? "bg-foreground text-background hover:bg-foreground" : ""
                  }`}
                >
                  {city}
                </button>
              ))}
            </div>
          ) : null}
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
