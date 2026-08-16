import { Card, LinkButton } from "@system2026/ui";
import type { StorePointOfSale } from "../lib/get-catalog";

export function PointsOfSaleSection({ locations }: { locations: StorePointOfSale[] }) {
  if (locations.length === 0) return null;

  return (
    <section className="mt-10 border-t border-border pt-8">
      <h2 className="mb-4 text-lg font-bold lg:text-xl">نقاط البيع 📍</h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {locations.map((location) => (
          <Card key={location.id}>
            <p className="font-semibold">{location.shop_name}</p>
            {location.google_maps_link ? (
              <LinkButton
                href={location.google_maps_link}
                target="_blank"
                rel="noreferrer"
                variant="outline"
                size="sm"
                className="mt-2"
              >
                فتح الموقع
              </LinkButton>
            ) : null}
          </Card>
        ))}
      </div>
    </section>
  );
}
