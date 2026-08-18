import { getStorePointsOfSale } from "../../lib/get-catalog";
import { PointsOfSaleList } from "../../components/points-of-sale-list";

export default async function PointsOfSalePage() {
  const locations = await getStorePointsOfSale();

  return (
    <main className="mx-auto max-w-3xl px-5 pb-16 pt-6 lg:px-8 lg:pt-10">
      <h1 className="mb-6 text-[24px] font-black tracking-tight lg:text-[28px]">نقاط البيع</h1>
      <PointsOfSaleList locations={locations} gridClassName="sm:grid-cols-2" />
    </main>
  );
}
