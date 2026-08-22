// أنواع مشتركة بين كل وحدات lib/provisioning — راجع الخطة المعتمدة
// (control-plane Phase 1) لتفاصيل كل خطوة.

export const PROVISIONING_STEPS = [
  "create_supabase_project",
  "wait_project_ready",
  "run_migrations",
  "create_first_admin",
  "create_railway_services",
  "trigger_deploys",
  "send_welcome_email",
] as const;

export type ProvisioningStepName = (typeof PROVISIONING_STEPS)[number];

export type TenantSignupInput = {
  companyName: string;
  contactName: string;
  contactEmail: string;
};

export type ProvisionedSupabaseProject = {
  projectRef: string;
  projectUrl: string;
  anonKey: string;
  /** يُستخدم لحظيًا فقط (إنشاء أول أدمن + كتابته كمتغير بيئة بـ Railway) — لا يُخزَّن أبدًا بقاعدة بيانات control-plane. */
  serviceRoleKey: string;
  /** رابط اتصال Postgres مباشر (وليس عبر supabase-js) لتشغيل migrations الخام. */
  directConnectionString: string;
};

export type ProvisionedRailwayServices = {
  railwayProjectId: string;
  railwayServiceIdAdmin: string;
  railwayServiceIdRep: string;
  railwayServiceIdStore: string;
  adminAppUrl: string;
  repAppUrl: string;
  storeAppUrl: string;
};
