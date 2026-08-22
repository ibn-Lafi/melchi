import "server-only";
import { createControlPlaneClient } from "./control-plane-db";
import {
  buildProvisionedProjectInfo,
  createSupabaseProject,
  getProjectApiKeys,
  resetProjectDbPassword,
  waitForProjectReady,
} from "./supabase-management";
import { runTenantMigrations } from "./migration-runner";
import { createFirstAdminUser } from "./first-admin";
import { createTenantRailwayServices } from "./railway";
import type { ProvisioningStepName, ProvisionedRailwayServices, TenantSignupInput } from "./types";

export type ProvisioningResult = {
  tenantId: string;
  adminAppUrl: string;
  repAppUrl: string;
  storeAppUrl: string;
  adminEmail: string;
  adminTemporaryPassword: string | null;
};

type ControlPlaneClient = ReturnType<typeof createControlPlaneClient>;

type TenantRow = { id: string; company_name: string; contact_name: string; contact_email: string };

type InfrastructureRow = {
  tenant_id: string;
  supabase_project_ref: string | null;
  supabase_project_url: string | null;
  supabase_anon_key: string | null;
  last_migration_applied: string | null;
  railway_project_id: string | null;
  railway_service_id_admin: string | null;
  railway_service_id_rep: string | null;
  railway_service_id_store: string | null;
  admin_app_url: string | null;
  rep_app_url: string | null;
  store_app_url: string | null;
};

/** يزوّد عميل SaaS جديدًا بالكامل من الصفر. */
export async function provisionNewTenant(input: TenantSignupInput): Promise<ProvisioningResult> {
  const db = createControlPlaneClient();

  const { data: tenant, error: tenantError } = await db
    .from("tenants")
    .insert({ company_name: input.companyName, contact_name: input.contactName, contact_email: input.contactEmail })
    .select()
    .single();
  if (tenantError || !tenant) throw new Error(`فشل إنشاء صف tenants: ${tenantError?.message}`);

  return runProvisioningPipeline(db, tenant as TenantRow, null);
}

/**
 * يستأنف تزويد عميل سبق أن فشلت محاولة تزويده — يقرأ tenant_infrastructure
 * الحالي ليتخطى كل ما نجح فعليًا (مشروع Supabase موجود؟ آخر migration
 * نجحت؟ خدمات Railway أُنشئت؟) بدل إعادة كل شيء من الصفر وتكرار الموارد.
 */
export async function retryTenantProvisioning(tenantId: string): Promise<ProvisioningResult> {
  const db = createControlPlaneClient();

  const { data: tenant, error: tenantError } = await db.from("tenants").select().eq("id", tenantId).single();
  if (tenantError || !tenant) throw new Error(`العميل غير موجود: ${tenantId}`);

  const { data: infra } = await db.from("tenant_infrastructure").select().eq("tenant_id", tenantId).maybeSingle();

  return runProvisioningPipeline(db, tenant as TenantRow, (infra as InfrastructureRow | null) ?? null);
}

async function runProvisioningPipeline(
  db: ControlPlaneClient,
  tenant: TenantRow,
  existingInfra: InfrastructureRow | null,
): Promise<ProvisioningResult> {
  const { data: run, error: runError } = await db
    .from("tenant_provisioning_runs")
    .insert({ tenant_id: tenant.id, current_step: "create_supabase_project" })
    .select()
    .single();
  if (runError || !run) throw new Error(`فشل إنشاء صف tenant_provisioning_runs: ${runError?.message}`);

  async function runStep<T>(stepName: ProvisioningStepName, fn: () => Promise<T>): Promise<T> {
    await db
      .from("tenant_provisioning_steps")
      .insert({ run_id: run.id, step_name: stepName, status: "in_progress", started_at: new Date().toISOString() });
    await db.from("tenant_provisioning_runs").update({ current_step: stepName }).eq("id", run.id);

    try {
      const result = await fn();
      await db
        .from("tenant_provisioning_steps")
        .update({ status: "succeeded", finished_at: new Date().toISOString() })
        .eq("run_id", run.id)
        .eq("step_name", stepName);
      return result;
    } catch (error) {
      const message = (error as Error).message;
      await db
        .from("tenant_provisioning_steps")
        .update({ status: "failed", finished_at: new Date().toISOString(), error_detail: message })
        .eq("run_id", run.id)
        .eq("step_name", stepName);
      await db.from("tenant_provisioning_runs").update({ status: "failed", last_error: message }).eq("id", run.id);
      throw error;
    }
  }

  async function skipStep(stepName: ProvisioningStepName): Promise<void> {
    await db.from("tenant_provisioning_steps").insert({ run_id: run.id, step_name: stepName, status: "skipped" });
  }

  const tenantSlug = slugify(tenant.company_name, tenant.id);

  // ========== مشروع Supabase ==========
  let projectRef = existingInfra?.supabase_project_ref ?? null;
  let dbPassword: string | null = null;

  if (projectRef) {
    await skipStep("create_supabase_project");
  } else {
    const created = await runStep("create_supabase_project", () => createSupabaseProject({ tenantSlug }));
    projectRef = created.projectRef;
    dbPassword = created.dbPassword;
    await upsertInfrastructure(db, tenant.id, { supabase_project_ref: projectRef });
  }

  await runStep("wait_project_ready", () => waitForProjectReady(projectRef!));

  const apiKeys = await getProjectApiKeys(projectRef!);

  // إعادة محاولة = عملية جديدة تمامًا لا تملك dbPassword الأصلية بالذاكرة —
  // تُستبدل بكلمة مرور جديدة عبر Management API بدل تخزين القديمة كسر دائم.
  if (!dbPassword) {
    dbPassword = await resetProjectDbPassword(projectRef!);
  }

  const project = buildProvisionedProjectInfo(projectRef!, dbPassword, apiKeys);
  await upsertInfrastructure(db, tenant.id, {
    supabase_project_ref: project.projectRef,
    supabase_project_url: project.projectUrl,
    supabase_anon_key: project.anonKey,
  });

  // ========== migrations (قابلة للاستئناف من آخر ملف نجح) ==========
  await runStep("run_migrations", () =>
    runTenantMigrations(project.directConnectionString, {
      resumeAfter: existingInfra?.last_migration_applied ?? null,
      onFileApplied: (fileName) => upsertInfrastructure(db, tenant.id, { last_migration_applied: fileName }),
    }),
  );

  // ========== أول حساب أدمن ==========
  const adminResult = await runStep("create_first_admin", () =>
    createFirstAdminUser({
      projectUrl: project.projectUrl,
      serviceRoleKey: project.serviceRoleKey,
      contactEmail: tenant.contact_email,
      contactName: tenant.contact_name,
    }),
  );

  // ========== خدمات Railway ==========
  let railwayInfo: ProvisionedRailwayServices;

  if (existingInfra?.railway_project_id) {
    await skipStep("create_railway_services");
    await skipStep("trigger_deploys");
    railwayInfo = {
      railwayProjectId: existingInfra.railway_project_id,
      railwayServiceIdAdmin: existingInfra.railway_service_id_admin!,
      railwayServiceIdRep: existingInfra.railway_service_id_rep!,
      railwayServiceIdStore: existingInfra.railway_service_id_store!,
      adminAppUrl: existingInfra.admin_app_url!,
      repAppUrl: existingInfra.rep_app_url!,
      storeAppUrl: existingInfra.store_app_url!,
    };
  } else {
    railwayInfo = await runStep("create_railway_services", () =>
      createTenantRailwayServices({
        tenantSlug,
        githubRepo: getGithubRepoSlug(),
        gitBranch: getDeploymentBranch(),
        supabaseUrl: project.projectUrl,
        supabaseAnonKey: project.anonKey,
        supabaseServiceRoleKey: project.serviceRoleKey,
      }),
    );

    await runStep("trigger_deploys", async () => {
      // النشر يحدث فعليًا داخل createTenantRailwayServices لكل خدمة على حدة —
      // هذه الخطوة موجودة فقط لمطابقة قائمة PROVISIONING_STEPS الموثّقة
      // بالخطة، بدون عمل إضافي حقيقي.
    });

    await upsertInfrastructure(db, tenant.id, {
      railway_project_id: railwayInfo.railwayProjectId,
      railway_service_id_admin: railwayInfo.railwayServiceIdAdmin,
      railway_service_id_rep: railwayInfo.railwayServiceIdRep,
      railway_service_id_store: railwayInfo.railwayServiceIdStore,
      admin_app_url: railwayInfo.adminAppUrl,
      rep_app_url: railwayInfo.repAppUrl,
      store_app_url: railwayInfo.storeAppUrl,
    });
  }

  await runStep("send_welcome_email", async () => {
    // مزوّد البريد الإلكتروني لم يُختر بعد (Phase 3) — الـ CLI script نفسه
    // يطبع بيانات الدخول بدل إرسال بريد فعلي حاليًا.
  });

  await db
    .from("tenant_provisioning_runs")
    .update({ status: "succeeded", completed_at: new Date().toISOString() })
    .eq("id", run.id);
  await db.from("tenants").update({ status: "active" }).eq("id", tenant.id);

  return {
    tenantId: tenant.id,
    adminAppUrl: railwayInfo.adminAppUrl,
    repAppUrl: railwayInfo.repAppUrl,
    storeAppUrl: railwayInfo.storeAppUrl,
    adminEmail: tenant.contact_email,
    adminTemporaryPassword: adminResult.temporaryPassword,
  };
}

async function upsertInfrastructure(
  db: ControlPlaneClient,
  tenantId: string,
  fields: Partial<Omit<InfrastructureRow, "tenant_id">>,
): Promise<void> {
  await db.from("tenant_infrastructure").upsert({ tenant_id: tenantId, ...fields }, { onConflict: "tenant_id" });
}

function slugify(companyName: string, tenantId: string): string {
  const base = companyName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  const shortId = tenantId.split("-")[0];
  return `${base || "tenant"}-${shortId}`;
}

function getGithubRepoSlug(): string {
  const repo = process.env.CONTROL_PLANE_GITHUB_REPO;
  if (!repo) throw new Error("CONTROL_PLANE_GITHUB_REPO غير مضبوط بمتغيرات البيئة (مثال: owner/repo)");
  return repo;
}

function getDeploymentBranch(): string {
  return process.env.CONTROL_PLANE_DEPLOYMENT_BRANCH ?? "main";
}
