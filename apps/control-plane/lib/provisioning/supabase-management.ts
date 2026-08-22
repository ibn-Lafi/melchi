import "server-only";
import { randomBytes } from "node:crypto";
import type { ProvisionedSupabaseProject } from "./types";

// طبقة نداء Supabase Management API لإنشاء مشروع Supabase جديد ومستقل بالكامل
// لكل عميل SaaS. تتطلب SUPABASE_MANAGEMENT_API_TOKEN (Personal Access Token
// بمستوى المؤسسة) و SUPABASE_ORGANIZATION_ID — كلاهما من نفس حساب الأدمن
// الحالي حسب قرار المستخدم. ملاحظة: هذه أول مرة يُستدعى فيها Management API
// بهذا المستودع — يجب التحقق من شكل الاستجابة الفعلي عند أول تشغيل حقيقي
// (راجع https://api.supabase.com/api/v1 وقت التنفيذ، فقد يتغيّر شكل الحقول).

const MANAGEMENT_API_BASE = "https://api.supabase.com/v1";

function getManagementApiToken(): string {
  const token = process.env.SUPABASE_MANAGEMENT_API_TOKEN;
  if (!token) throw new Error("SUPABASE_MANAGEMENT_API_TOKEN غير مضبوط بمتغيرات البيئة");
  return token;
}

function getOrganizationId(): string {
  const orgId = process.env.SUPABASE_ORGANIZATION_ID;
  if (!orgId) throw new Error("SUPABASE_ORGANIZATION_ID غير مضبوط بمتغيرات البيئة");
  return orgId;
}

async function managementApiFetch(path: string, init?: RequestInit): Promise<unknown> {
  const response = await fetch(`${MANAGEMENT_API_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${getManagementApiToken()}`,
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Supabase Management API فشل (${response.status} ${path}): ${body}`);
  }

  return response.json();
}

type CreateProjectResponse = { id: string; name: string; status: string };

/** ينشئ مشروع Supabase جديد فارغ لعميل SaaS جديد. يُرجع project ref فورًا — المشروع لا يكون جاهزًا بعد (راجع waitForProjectReady). */
export async function createSupabaseProject(input: {
  tenantSlug: string;
  region?: string;
}): Promise<{ projectRef: string; dbPassword: string }> {
  const dbPassword = randomBytes(24).toString("base64url");

  const result = (await managementApiFetch("/projects", {
    method: "POST",
    body: JSON.stringify({
      organization_id: getOrganizationId(),
      name: `tenant-${input.tenantSlug}`,
      region: input.region ?? "us-east-1",
      db_pass: dbPassword,
      plan: "free",
    }),
  })) as CreateProjectResponse;

  return { projectRef: result.id, dbPassword };
}

type ProjectStatusResponse = { id: string; status: string };

/** يستطلع حالة المشروع حتى يصبح جاهزًا (ACTIVE_HEALTHY) أو ينتهي المهلة. إنشاء مشروع Supabase غير متزامن (1-3 دقائق عادة). */
export async function waitForProjectReady(
  projectRef: string,
  options: { timeoutMs?: number; intervalMs?: number } = {},
): Promise<void> {
  const timeoutMs = options.timeoutMs ?? 5 * 60 * 1000;
  const intervalMs = options.intervalMs ?? 10 * 1000;
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const project = (await managementApiFetch(`/projects/${projectRef}`)) as ProjectStatusResponse;
    if (project.status === "ACTIVE_HEALTHY") return;
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }

  throw new Error(`مشروع Supabase (${projectRef}) لم يصبح جاهزًا خلال ${timeoutMs}ms`);
}

type ApiKeysResponse = Array<{ name: string; api_key: string }>;

/** يجلب anon key و service_role key الخاصين بمشروع جاهز. */
export async function getProjectApiKeys(projectRef: string): Promise<{ anonKey: string; serviceRoleKey: string }> {
  const keys = (await managementApiFetch(`/projects/${projectRef}/api-keys`)) as ApiKeysResponse;

  const anonKey = keys.find((k) => k.name === "anon")?.api_key;
  const serviceRoleKey = keys.find((k) => k.name === "service_role")?.api_key;

  if (!anonKey || !serviceRoleKey) {
    throw new Error(`تعذّر إيجاد anon/service_role keys لمشروع ${projectRef}`);
  }

  return { anonKey, serviceRoleKey };
}

/** يبني كل بيانات المشروع اللازمة للخطوات التالية (تشغيل migrations، إنشاء أول أدمن، متغيرات بيئة Railway). */
export function buildProvisionedProjectInfo(
  projectRef: string,
  dbPassword: string,
  keys: { anonKey: string; serviceRoleKey: string },
): ProvisionedSupabaseProject {
  return {
    projectRef,
    projectUrl: `https://${projectRef}.supabase.co`,
    anonKey: keys.anonKey,
    serviceRoleKey: keys.serviceRoleKey,
    // اتصال Postgres مباشر (وليس عبر supabase-js) لتشغيل ملفات migrations
    // الخام بأمر واحد — تحقّق من قيمة host الفعلية بلوحة تحكم المشروع لو
    // اختلفت (Supabase قد يستخدم pooler منفصل حسب المنطقة/الخطة).
    directConnectionString: `postgresql://postgres:${dbPassword}@db.${projectRef}.supabase.co:5432/postgres`,
  };
}
