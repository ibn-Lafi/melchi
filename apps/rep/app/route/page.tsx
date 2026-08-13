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
      <main className="p-4">
        <h1 className="mb-4 text-xl font-bold">خط السير</h1>
        <div className="grid gap-3">
          {(customers ?? []).map((customer) => (
            <Card key={customer.id}>
              <p className="font-semibold">{customer.shop_name ?? customer.name}</p>
              {customer.address ? <p className="text-sm text-foreground/60">{customer.address}</p> : null}
              <div className="mt-2 flex gap-3">
                {customer.google_maps_link ? (
                  <a
                    href={customer.google_maps_link}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm text-primary underline"
                  >
                    فتح الموقع 📍
                  </a>
                ) : null}
                <Link href={`/invoice/new?customerId=${customer.id}`} className="text-sm text-primary underline">
                  فاتورة جديدة
                </Link>
                <Link href={`/collections?customerId=${customer.id}`} className="text-sm text-primary underline">
                  تسجيل تحصيل
                </Link>
              </div>
            </Card>
          ))}
          {(customers?.length ?? 0) === 0 ? (
            <p className="text-foreground/60">لا يوجد عملاء بخط سيرك بعد</p>
          ) : null}
        </div>
      </main>
    </div>
  );
}
