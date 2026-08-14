import { Button, Card, PageHeader, Breadcrumb } from "@system2026/ui";
import { createSupabaseServerClient } from "@system2026/database/server";
import { approveInvoiceEditRequest, rejectInvoiceEditRequest } from "./review-actions";

type EditRequest = {
  id: string;
  invoice_id: string;
  requested_by: string;
  reason: string;
  requested_changes: Record<string, unknown>;
  status: string;
  created_at: string;
};

export default async function InvoiceRequestsPage() {
  const supabase = createSupabaseServerClient();

  const { data: requests } = await supabase
    .from("invoice_edit_requests")
    .select<
      "id, invoice_id, requested_by, reason, requested_changes, status, created_at",
      EditRequest
    >("id, invoice_id, requested_by, reason, requested_changes, status, created_at")
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  const invoiceIds = (requests ?? []).map((r) => r.invoice_id);
  const repIds = (requests ?? []).map((r) => r.requested_by);

  const [{ data: invoices }, { data: reps }] = await Promise.all([
    invoiceIds.length > 0
      ? supabase
          .from("invoices")
          .select<"id, invoice_number", { id: string; invoice_number: number }>("id, invoice_number")
          .in("id", invoiceIds)
      : Promise.resolve({ data: [] as { id: string; invoice_number: number }[] }),
    repIds.length > 0
      ? supabase.from("profiles").select<"id, name", { id: string; name: string }>("id, name").in("id", repIds)
      : Promise.resolve({ data: [] as { id: string; name: string }[] }),
  ]);

  const invoiceNumberById = new Map((invoices ?? []).map((i) => [i.id, i.invoice_number]));
  const repNameById = new Map((reps ?? []).map((r) => [r.id, r.name]));

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumb={<Breadcrumb items={["لوحة التحكم", "الفواتير", "طلبات التعديل"]} />}
        title="طلبات تعديل/إلغاء الفواتير"
        subtitle="طلبات بعد انتهاء فترة السماح (راجع requirements.md §7.7) — تحتاج موافقتك، والموافقة على &quot;إلغاء كامل&quot; تُنشئ إشعار دائن تلقائيًا وتعيد الكمية للمخزون."
      />

      <div className="space-y-3">
        {(requests ?? []).map((req) => (
          <Card key={req.id}>
            <div className="flex items-start justify-between gap-4">
              <div className="text-sm">
                <p className="font-semibold">
                  فاتورة #{invoiceNumberById.get(req.invoice_id) ?? "—"} — {repNameById.get(req.requested_by) ?? "—"}
                </p>
                <p className="mt-1 text-foreground/70">السبب: {req.reason}</p>
                <p className="mt-1 text-foreground/70">
                  نوع الطلب: {req.requested_changes?.action === "cancel" ? "إلغاء كامل" : "تعديل"}
                </p>
                <p className="mt-1 text-xs text-foreground/50">
                  {new Date(req.created_at).toLocaleString("ar-SA")}
                </p>
              </div>
              <div className="flex gap-2">
                <form action={approveInvoiceEditRequest}>
                  <input type="hidden" name="requestId" value={req.id} />
                  <Button type="submit">موافقة</Button>
                </form>
                <form action={rejectInvoiceEditRequest}>
                  <input type="hidden" name="requestId" value={req.id} />
                  <Button type="submit" variant="destructive">
                    رفض
                  </Button>
                </form>
              </div>
            </div>
          </Card>
        ))}
        {(requests?.length ?? 0) === 0 ? (
          <p className="text-foreground/60">لا توجد طلبات معلّقة حاليًا</p>
        ) : null}
      </div>
    </div>
  );
}
