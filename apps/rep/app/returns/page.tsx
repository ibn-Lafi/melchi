import { createSupabaseServerClient } from "@system2026/database/server";
import { AppNav } from "../../components/nav";
import { ReturnForm } from "./return-form";

export default async function ReturnsPage({
  searchParams,
}: {
  searchParams: { customerId?: string };
}) {
  const supabase = createSupabaseServerClient();

  const [{ data: customers }, { data: products }] = await Promise.all([
    supabase
      .from("customers")
      .select<"id, name, shop_name", { id: string; name: string; shop_name: string | null }>(
        "id, name, shop_name",
      )
      .order("name"),
    supabase.from("products").select<"id, name", { id: string; name: string }>("id, name").order("name"),
  ]);

  return (
    <div>
      <AppNav />
      <main className="mx-auto max-w-2xl p-4">
        <h1 className="mb-4 text-xl font-bold">تسجيل مرتجع</h1>
        {(customers?.length ?? 0) === 0 ? (
          <p className="text-foreground/60">لا يوجد عملاء بخط سيرك بعد</p>
        ) : (
          <ReturnForm
            customers={customers ?? []}
            products={products ?? []}
            defaultCustomerId={searchParams.customerId}
          />
        )}
      </main>
    </div>
  );
}
