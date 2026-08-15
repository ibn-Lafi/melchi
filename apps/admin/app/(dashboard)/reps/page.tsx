import { Badge, Card, Input, ModalTrigger, PageHeader, Breadcrumb } from "@system2026/ui";
import { formatCurrency } from "@system2026/utils";
import { createSupabaseServerClient } from "@system2026/database/server";
import { ActionForm } from "../../../components/action-form";
import { getProfitSummary } from "../../../lib/get-profitability";
import { getCurrentUserRole } from "../../../lib/get-current-role";
import { createRepAction, toggleRepActiveAction } from "./actions";

type Rep = { id: string; name: string; email: string | null; phone: string | null; is_active: boolean };

export default async function RepsPage() {
  const supabase = createSupabaseServerClient();
  const role = await getCurrentUserRole();

  const [{ data: reps }, profitSummary] = await Promise.all([
    supabase
      .from("profiles")
      .select<"id, name, email, phone, is_active", Rep>("id, name, email, phone, is_active")
      .eq("role", "rep")
      .order("name"),
    getProfitSummary(),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumb={<Breadcrumb items={["لوحة التحكم", "المناديب"]} />}
        title="المناديب"
        subtitle="إدارة حسابات المناديب ومتابعة أدائهم"
        actions={
          role === "admin" ? (
            <ModalTrigger label="+ إضافة مندوب" title="إضافة مندوب">
              <ActionForm action={createRepAction} className="space-y-3">
                <div>
                  <label className="mb-1 block text-sm">الاسم</label>
                  <Input name="name" required />
                </div>
                <div>
                  <label className="mb-1 block text-sm">البريد الإلكتروني (لتسجيل الدخول)</label>
                  <Input name="email" type="email" dir="ltr" required />
                </div>
                <div>
                  <label className="mb-1 block text-sm">رقم الجوال (اختياري)</label>
                  <Input name="phone" dir="ltr" />
                </div>
                <div>
                  <label className="mb-1 block text-sm">كلمة المرور</label>
                  <Input name="password" type="password" required minLength={6} />
                </div>
              </ActionForm>
            </ModalTrigger>
          ) : null
        }
      />

      <Card>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-right text-foreground/60">
              <th className="py-2">الاسم</th>
              <th>البريد الإلكتروني</th>
              <th>الجوال</th>
              <th>إجمالي المبيعات</th>
              <th>إجمالي الربح</th>
              <th>الحالة</th>
              {role === "admin" ? <th></th> : null}
            </tr>
          </thead>
          <tbody>
            {(reps ?? []).map((rep) => {
              const stats = profitSummary.byRep.get(rep.id);
              return (
                <tr key={rep.id} className="border-b border-border/50">
                  <td className="py-2">{rep.name}</td>
                  <td dir="ltr">{rep.email ?? "—"}</td>
                  <td>{rep.phone ?? "—"}</td>
                  <td>{formatCurrency(stats?.sales ?? 0)}</td>
                  <td>{formatCurrency(stats?.profit ?? 0)}</td>
                  <td>
                    <Badge variant={rep.is_active ? "success" : "muted"}>
                      {rep.is_active ? "نشط" : "موقوف"}
                    </Badge>
                  </td>
                  {role === "admin" ? (
                    <td>
                      <form action={toggleRepActiveAction}>
                        <input type="hidden" name="repId" value={rep.id} />
                        <input type="hidden" name="nextIsActive" value={(!rep.is_active).toString()} />
                        <button
                          type="submit"
                          className="inline-flex h-9 items-center justify-center rounded-lg border border-border px-3 text-xs font-medium transition-colors hover:bg-muted"
                        >
                          {rep.is_active ? "إيقاف" : "تفعيل"}
                        </button>
                      </form>
                    </td>
                  ) : null}
                </tr>
              );
            })}
          </tbody>
        </table>
        {(reps?.length ?? 0) === 0 ? <p className="py-4 text-foreground/60">لا يوجد مناديب بعد</p> : null}
      </Card>

    </div>
  );
}
