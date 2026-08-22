import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge, Card, PageHeader, Breadcrumb, Button } from "@system2026/ui";
import { createControlPlaneClient } from "../../../lib/provisioning/control-plane-db";
import { PROVISIONING_STEPS, type ProvisioningStepName } from "../../../lib/provisioning/types";
import { retryProvisioningAction } from "./actions";

export const dynamic = "force-dynamic";

type TenantRow = {
  id: string;
  company_name: string;
  contact_name: string;
  contact_email: string;
  status: "pending" | "active" | "suspended" | "cancelled";
  created_at: string;
};

type RunRow = {
  id: string;
  status: "in_progress" | "succeeded" | "failed";
  current_step: string | null;
  started_at: string;
  completed_at: string | null;
  last_error: string | null;
};

type StepRow = {
  step_name: ProvisioningStepName;
  status: "pending" | "in_progress" | "succeeded" | "failed" | "skipped";
  started_at: string | null;
  finished_at: string | null;
  error_detail: string | null;
};

type InfrastructureRow = {
  admin_app_url: string | null;
  rep_app_url: string | null;
  store_app_url: string | null;
  supabase_project_ref: string | null;
};

const STEP_LABELS: Record<ProvisioningStepName, string> = {
  create_supabase_project: "إنشاء مشروع Supabase",
  wait_project_ready: "انتظار جاهزية المشروع",
  run_migrations: "تطبيق migrations",
  create_first_admin: "إنشاء أول حساب أدمن",
  create_railway_services: "إنشاء خدمات Railway",
  trigger_deploys: "تشغيل النشر",
  send_welcome_email: "إرسال بريد الترحيب",
};

const STEP_STATUS_BADGE: Record<StepRow["status"], "success" | "warning" | "muted" | "danger"> = {
  pending: "muted",
  in_progress: "warning",
  succeeded: "success",
  failed: "danger",
  skipped: "muted",
};

const STEP_STATUS_LABELS: Record<StepRow["status"], string> = {
  pending: "لم تبدأ",
  in_progress: "جارية",
  succeeded: "نجحت",
  failed: "فشلت",
  skipped: "تم تخطّيها (نجحت سابقًا)",
};

export default async function TenantDetailPage({ params }: { params: { id: string } }) {
  const db = createControlPlaneClient();

  const { data: tenant } = await db.from("tenants").select().eq("id", params.id).maybeSingle();
  if (!tenant) notFound();
  const typedTenant = tenant as TenantRow;

  const { data: latestRun } = await db
    .from("tenant_provisioning_runs")
    .select()
    .eq("tenant_id", params.id)
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const run = latestRun as RunRow | null;

  const { data: stepsData } = run
    ? await db.from("tenant_provisioning_steps").select().eq("run_id", run.id).order("created_at", { ascending: true })
    : { data: [] };
  const steps = (stepsData ?? []) as StepRow[];
  const stepByName = new Map(steps.map((step) => [step.step_name, step]));

  const { data: infra } = await db
    .from("tenant_infrastructure")
    .select()
    .eq("tenant_id", params.id)
    .maybeSingle();
  const infrastructure = infra as InfrastructureRow | null;

  const canRetry = run?.status === "failed";

  return (
    <div className="mx-auto max-w-3xl p-6">
      <PageHeader
        breadcrumb={
          <Breadcrumb items={["العملاء", typedTenant.company_name]} />
        }
        title={typedTenant.company_name}
        subtitle={typedTenant.contact_email}
        actions={
          <Link href="/tenants">
            <Button variant="outline">رجوع للعملاء</Button>
          </Link>
        }
      />

      <div className="space-y-4">
        <Card>
          <h2 className="font-semibold">بيانات العميل</h2>
          <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
            <div>
              <dt className="text-muted-foreground">اسم المسؤول</dt>
              <dd>{typedTenant.contact_name}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">البريد الإلكتروني</dt>
              <dd dir="ltr">{typedTenant.contact_email}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">تاريخ التسجيل</dt>
              <dd>{new Date(typedTenant.created_at).toLocaleString("ar")}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">مرجع مشروع Supabase</dt>
              <dd dir="ltr">{infrastructure?.supabase_project_ref ?? "—"}</dd>
            </div>
          </dl>
        </Card>

        {infrastructure?.admin_app_url ? (
          <Card>
            <h2 className="font-semibold">روابط التطبيقات</h2>
            <div className="mt-3 space-y-1.5 text-sm" dir="ltr">
              <p>
                admin: <a className="underline" href={infrastructure.admin_app_url}>{infrastructure.admin_app_url}</a>
              </p>
              <p>
                rep: <a className="underline" href={infrastructure.rep_app_url ?? "#"}>{infrastructure.rep_app_url}</a>
              </p>
              <p>
                store: <a className="underline" href={infrastructure.store_app_url ?? "#"}>{infrastructure.store_app_url}</a>
              </p>
            </div>
          </Card>
        ) : null}

        <Card>
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">آخر محاولة تزويد</h2>
            {canRetry ? (
              <form action={retryProvisioningAction}>
                <input type="hidden" name="tenantId" value={typedTenant.id} />
                <Button type="submit" size="sm">
                  إعادة المحاولة
                </Button>
              </form>
            ) : null}
          </div>

          {!run ? (
            <p className="mt-3 text-sm text-muted-foreground">لا توجد أي محاولة تزويد بعد.</p>
          ) : (
            <>
              {run.last_error ? (
                <p className="mt-3 rounded-lg bg-muted p-3 text-sm text-foreground/80">{run.last_error}</p>
              ) : null}

              <div className="mt-4 space-y-2">
                {PROVISIONING_STEPS.map((stepName) => {
                  const step = stepByName.get(stepName);
                  return (
                    <div key={stepName} className="flex items-center justify-between rounded-lg border border-border p-3">
                      <span className="text-sm">{STEP_LABELS[stepName]}</span>
                      <Badge variant={step ? STEP_STATUS_BADGE[step.status] : "muted"}>
                        {step ? STEP_STATUS_LABELS[step.status] : "لم تبدأ"}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
