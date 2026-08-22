import Link from "next/link";
import { Badge, Card, PageHeader } from "@system2026/ui";
import { createControlPlaneClient } from "../../../lib/provisioning/control-plane-db";

// بيانات العملاء تتغيّر باستمرار (تزويد جديد، إعادة محاولة) — لا يجوز
// تجميدها كصفحة ثابتة وقت البناء (لا توجد بيئة Supabase حقيقية وقت البناء أصلًا).
export const dynamic = "force-dynamic";

type TenantRow = {
  id: string;
  company_name: string;
  contact_email: string;
  status: "pending" | "active" | "suspended" | "cancelled";
  created_at: string;
};

const STATUS_LABELS: Record<TenantRow["status"], string> = {
  pending: "قيد التزويد",
  active: "نشط",
  suspended: "معلَّق",
  cancelled: "ملغى",
};

const STATUS_BADGE_VARIANT: Record<TenantRow["status"], "success" | "warning" | "muted" | "danger"> = {
  pending: "warning",
  active: "success",
  suspended: "muted",
  cancelled: "danger",
};

export default async function TenantsPage() {
  const db = createControlPlaneClient();
  const { data } = await db.from("tenants").select().order("created_at", { ascending: false });
  const tenants = (data ?? []) as TenantRow[];

  return (
    <div className="mx-auto max-w-4xl p-6">
      <PageHeader title="العملاء" subtitle="كل عملاء SaaS المسجَّلين وحالة تزويدهم" />

      {tenants.length === 0 ? (
        <Card>
          <p className="text-sm text-muted-foreground">لا يوجد عملاء بعد — استخدم سكربت التزويد لإضافة أول عميل.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {tenants.map((tenant) => (
            <Link key={tenant.id} href={`/tenants/${tenant.id}`}>
              <Card className="flex items-center justify-between hover:shadow-card-hover">
                <div>
                  <p className="font-semibold">{tenant.company_name}</p>
                  <p className="mt-0.5 text-sm text-muted-foreground" dir="ltr">
                    {tenant.contact_email}
                  </p>
                </div>
                <Badge variant={STATUS_BADGE_VARIANT[tenant.status]}>{STATUS_LABELS[tenant.status]}</Badge>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
