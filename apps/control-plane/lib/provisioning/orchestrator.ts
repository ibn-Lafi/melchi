import "server-only";
import { createControlPlaneClient } from "./control-plane-db";
import {
  buildProvisionedProjectInfo,
  createSupabaseProject,
  getProjectApiKeys,
  waitForProjectReady,
} from "./supabase-management";
import { runTenantMigrations } from "./migration-runner";
import { createFirstAdminUser } from "./first-admin";
import { createTenantRailwayServices } from "./railway";
import type { ProvisioningStepName, TenantSignupInput } from "./types";

export type ProvisioningResult = {
  tenantId: string;
  adminAppUrl: string;
  repAppUrl: string;
  storeAppUrl: string;
  adminEmail: string;
  adminTemporaryPassword: string;
};

// المنسّق الكامل لتزويد عميل SaaS جديد من الصفر — ينفّذ كل خطوة، ويحفظ
// حالتها بجدول tenant_provisioning_steps فور بدئها وانتهائها (نجاحًا أو
// فشلًا) حتى يبقى الفشل مرئيًا وقابلًا للتشخيص بدل أن يكون صامتًا (راجع
// الخطة المعتمدة، Phase 1).
export async function provisionTenant(input: TenantSignupInput): Promise<ProvisioningResult> {
  const db = createControlPlaneClient();

  const { data: tenant, error: tenantError } = await db
    .from("tenants")
    .insert({ company_name: input.companyName, contact_name: input.contactName, contact_email: input.contactEmail })
    .select()
    .single();
  if (tenantError || !tenant) throw new Error(`فشل إنشاء صف tenants: ${tenantError?.message}`);

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

  const tenantSlug = slugify(input.companyName, tenant.id);

  const { projectRef, dbPassword } = await runStep("create_supabase_project", () =>
    createSupabaseProject({ tenantSlug }),
  );

  await runStep("wait_project_ready", () => waitForProjectReady(projectRef));

  // قراءة صغيرة بعد جاهزية المشروع — ليست خطوة موثّقة منفصلة بجدول التتبع.
  const apiKeys = await getProjectApiKeys(projectRef);
  const project = buildProvisionedProjectInfo(projectRef, dbPassword, apiKeys);

  await runStep("run_migrations", () => runTenantMigrations(project.directConnectionString));

  const { temporaryPassword } = await runStep("create_first_admin", () =>
    createFirstAdminUser({
      projectUrl: project.projectUrl,
      serviceRoleKey: project.serviceRoleKey,
      contactEmail: input.contactEmail,
      contactName: input.contactName,
    }),
  );

  const railwayInfo = await runStep("create_railway_services", () =>
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

  await db.from("tenant_infrastructure").insert({
    tenant_id: tenant.id,
    supabase_project_ref: project.projectRef,
    supabase_project_url: project.projectUrl,
    supabase_anon_key: project.anonKey,
    railway_project_id: railwayInfo.railwayProjectId,
    railway_service_id_admin: railwayInfo.railwayServiceIdAdmin,
    railway_service_id_rep: railwayInfo.railwayServiceIdRep,
    railway_service_id_store: railwayInfo.railwayServiceIdStore,
    admin_app_url: railwayInfo.adminAppUrl,
    rep_app_url: railwayInfo.repAppUrl,
    store_app_url: railwayInfo.storeAppUrl,
  });

  await runStep("send_welcome_email", async () => {
    // مزوّد البريد الإلكتروني لم يُختر بعد (Phase 3) — الـ CLI script نفسه
    // يطبع بيانات الدخول بدل إرسال بريد فعلي حاليًا.
  });

  await db.from("tenant_provisioning_runs").update({ status: "succeeded", completed_at: new Date().toISOString() }).eq(
    "id",
    run.id,
  );
  await db.from("tenants").update({ status: "active" }).eq("id", tenant.id);

  return {
    tenantId: tenant.id,
    adminAppUrl: railwayInfo.adminAppUrl,
    repAppUrl: railwayInfo.repAppUrl,
    storeAppUrl: railwayInfo.storeAppUrl,
    adminEmail: input.contactEmail,
    adminTemporaryPassword: temporaryPassword,
  };
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
