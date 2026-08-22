export default function ControlPlaneHomePage() {
  return (
    <main className="flex min-h-screen items-center justify-center p-8 text-center">
      <div>
        <h1 className="text-xl font-bold">لوحة التحكم المركزية</h1>
        <p className="mt-2 text-sm text-foreground/60">
          قيد الإنشاء — حاليًا التزويد يتم عبر سكربت CLI فقط (pnpm --filter control-plane provision). لوحة تشغيلية
          بواجهة كاملة ستُضاف لاحقًا.
        </p>
      </div>
    </main>
  );
}
