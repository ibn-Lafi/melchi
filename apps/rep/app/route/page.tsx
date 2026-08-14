import Link from "next/link";
import { Card } from "@system2026/ui";
import { createSupabaseServerClient } from "@system2026/database/server";
import { AppNav } from "../../components/nav";

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
      <main className="p-4 pb-28 sm:pb-8">
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-xl font-bold">خط السير</h1>
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
              <div className="mt-3 flex flex-wrap gap-1.5">
                {customer.google_maps_link ? (
                  <a
                    href={customer.google_maps_link}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-full bg-muted px-3 py-1.5 text-xs font-medium transition-colors hover:bg-primary hover:text-primary-foreground"
                  >
                    فتح الموقع 📍
                  </a>
                ) : null}
                <Link
                  href={`/invoice/new?customerId=${customer.id}`}
                  className="rounded-full bg-muted px-3 py-1.5 text-xs font-medium transition-colors hover:bg-primary hover:text-primary-foreground"
                >
                  فاتورة جديدة
                </Link>
                <Link
                  href={`/collections?customerId=${customer.id}`}
                  className="rounded-full bg-muted px-3 py-1.5 text-xs font-medium transition-colors hover:bg-primary hover:text-primary-foreground"
                >
                  تسجيل تحصيل
                </Link>
                <Link
                  href={`/returns?customerId=${customer.id}`}
                  className="rounded-full bg-muted px-3 py-1.5 text-xs font-medium transition-colors hover:bg-primary hover:text-primary-foreground"
                >
                  تسجيل مرتجع
                </Link>
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
