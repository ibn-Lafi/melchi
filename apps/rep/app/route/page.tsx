import Link from "next/link";
import { Card } from "@system2026/ui";
import { createSupabaseServerClient } from "@system2026/database/server";
import { AppNav } from "../../components/nav";
import { InvoiceQuickButton } from "./invoice-quick-button";
import { ReturnQuickButton } from "./return-quick-button";
import { CollectionQuickButton } from "./collection-quick-button";

type CustomerRow = {
  id: string;
  name: string;
  shop_name: string | null;
  address: string | null;
  google_maps_link: string | null;
};

export default async function RoutePage() {
  const supabase = createSupabaseServerClient();
  const { data: customers } = await supabase
    .from("customers")
    .select<"id, name, shop_name, address, google_maps_link", CustomerRow>(
      "id, name, shop_name, address, google_maps_link",
    )
    .order("name");

  return (
    <div>
      <AppNav />
      <main className="p-4 pb-28">
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-xl font-bold">العملاء</h1>
          <Link
            href="/route/new-customer"
            className="rounded-full border border-border px-3.5 py-1.5 text-sm font-medium transition-colors hover:bg-muted"
          >
            + عميل جديد
          </Link>
        </div>
        <div className="grid gap-3">
          {(customers ?? []).map((customer) => (
            <Card key={customer.id}>
              <p className="font-semibold">{customer.shop_name ?? customer.name}</p>
              {customer.address ? (
                <p className="text-sm text-muted-foreground">{customer.address}</p>
              ) : null}
              <div className="-mx-5 mt-3 flex gap-1.5 overflow-x-auto px-5 pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {customer.google_maps_link ? (
                  <a
                    href={customer.google_maps_link}
                    target="_blank"
                    rel="noreferrer"
                    className="shrink-0 rounded-full bg-muted px-3 py-1.5 text-xs font-medium transition-colors hover:bg-primary hover:text-primary-foreground"
                  >
                    فتح الموقع
                  </a>
                ) : null}
                <InvoiceQuickButton customerId={customer.id} />
                <CollectionQuickButton customerId={customer.id} />
                <ReturnQuickButton customerId={customer.id} />
              </div>
            </Card>
          ))}
          {(customers?.length ?? 0) === 0 ? (
            <p className="py-12 text-center text-muted-foreground">لا يوجد عملاء بخط سيرك بعد</p>
          ) : null}
        </div>
      </main>
    </div>
  );
}
