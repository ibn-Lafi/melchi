import type { StorePointOfSale } from "../lib/get-catalog";
import { PointsOfSaleList } from "./points-of-sale-list";

export function PointsOfSaleSection({ locations }: { locations: StorePointOfSale[] }) {
  if (locations.length === 0) return null;

  return (
    <section className="mx-auto mt-12 max-w-5xl px-5 lg:mt-16 lg:max-w-6xl lg:px-8 xl:max-w-7xl">
      <h2 className="mb-1.5 text-[19px] font-black lg:text-[22px]">قريب منك دائمًا</h2>
      <p className="mb-5 text-[13.5px] leading-relaxed text-muted-foreground">تصفّح فروعنا وموقعها على الخريطة.</p>
      <PointsOfSaleList locations={locations} />
    </section>
  );
}
