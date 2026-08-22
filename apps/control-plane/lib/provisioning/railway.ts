import "server-only";
import type { ProvisionedRailwayServices } from "./types";

// طبقة نداء Railway Public API (GraphQL) لإنشاء مشروع Railway جديد بـ 3
// خدمات (admin/rep/store) لكل عميل SaaS، بنفس مستودع الكود الحالي.
//
// تنبيه هام: هذه أول مرة يُستدعى فيها Railway API بهذا المستودع، ولا يوجد
// اختبار حي متاح بدون RAILWAY_API_TOKEN فعلي. أسماء الـ mutations/الحقول
// أدناه مبنية على شكل Railway GraphQL API v2 العام المعروف وقت كتابة هذا
// الكود — **يجب التحقق منها عبر GraphQL introspection على backboard فعليًا
// قبل أول تشغيل حقيقي** (راجع خطوة "Phase 1 exit criterion" بالخطة
// المعتمدة)، وتعديلها هنا لو تغيّر الـ schema.

const RAILWAY_API_URL = "https://backboard.railway.app/graphql/v2";

function getRailwayApiToken(): string {
  const token = process.env.RAILWAY_API_TOKEN;
  if (!token) throw new Error("RAILWAY_API_TOKEN غير مضبوط بمتغيرات البيئة");
  return token;
}

async function railwayGraphQL<T>(query: string, variables: Record<string, unknown>): Promise<T> {
  const response = await fetch(RAILWAY_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${getRailwayApiToken()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query, variables }),
  });

  const body = (await response.json()) as { data?: T; errors?: Array<{ message: string }> };

  if (!response.ok || body.errors?.length) {
    throw new Error(`Railway API فشل: ${body.errors?.map((e) => e.message).join("; ") ?? response.statusText}`);
  }

  return body.data as T;
}

const APP_ROOT_DIRECTORIES = {
  admin: "apps/admin",
  rep: "apps/rep",
  store: "apps/store",
} as const;

type AppKey = keyof typeof APP_ROOT_DIRECTORIES;

/** ينشئ مشروع Railway جديد لعميل SaaS، يحتوي 3 خدمات (admin/rep/store) مربوطة بنفس مستودع الكود، كل واحدة بمجلد جذر مختلف، مع ضبط متغيرات بيئة Supabase الخاصة بهذا العميل ثم نشرها. */
export async function createTenantRailwayServices(input: {
  tenantSlug: string;
  githubRepo: string;
  gitBranch: string;
  supabaseUrl: string;
  supabaseAnonKey: string;
  supabaseServiceRoleKey: string;
}): Promise<ProvisionedRailwayServices> {
  const projectId = await createProject(`tenant-${input.tenantSlug}`);
  const environmentId = await getProductionEnvironmentId(projectId);

  const serviceIds: Record<AppKey, string> = {
    admin: "",
    rep: "",
    store: "",
  };

  for (const app of Object.keys(APP_ROOT_DIRECTORIES) as AppKey[]) {
    const serviceId = await createService({
      projectId,
      name: `${input.tenantSlug}-${app}`,
      githubRepo: input.githubRepo,
      gitBranch: input.gitBranch,
      rootDirectory: APP_ROOT_DIRECTORIES[app],
    });
    serviceIds[app] = serviceId;

    const envVars: Record<string, string> = {
      NEXT_PUBLIC_SUPABASE_URL: input.supabaseUrl,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: input.supabaseAnonKey,
    };
    if (app === "admin") {
      envVars.SUPABASE_SERVICE_ROLE_KEY = input.supabaseServiceRoleKey;
    }

    await upsertServiceVariables({ projectId, environmentId, serviceId, variables: envVars });
    await deployService({ serviceId, environmentId });
  }

  const [adminAppUrl, repAppUrl, storeAppUrl] = await Promise.all([
    getServiceDomain(serviceIds.admin),
    getServiceDomain(serviceIds.rep),
    getServiceDomain(serviceIds.store),
  ]);

  return {
    railwayProjectId: projectId,
    railwayServiceIdAdmin: serviceIds.admin,
    railwayServiceIdRep: serviceIds.rep,
    railwayServiceIdStore: serviceIds.store,
    adminAppUrl,
    repAppUrl,
    storeAppUrl,
  };
}

async function createProject(name: string): Promise<string> {
  const data = await railwayGraphQL<{ projectCreate: { id: string } }>(
    `mutation ProjectCreate($input: ProjectCreateInput!) {
      projectCreate(input: $input) { id }
    }`,
    { input: { name } },
  );
  return data.projectCreate.id;
}

async function getProductionEnvironmentId(projectId: string): Promise<string> {
  const data = await railwayGraphQL<{
    project: { environments: { edges: Array<{ node: { id: string; name: string } }> } };
  }>(
    `query ProjectEnvironments($id: String!) {
      project(id: $id) { environments { edges { node { id name } } } }
    }`,
    { id: projectId },
  );

  const production = data.project.environments.edges.find((e) => e.node.name === "production");
  if (!production) throw new Error(`تعذّر إيجاد بيئة production لمشروع Railway ${projectId}`);
  return production.node.id;
}

async function createService(input: {
  projectId: string;
  name: string;
  githubRepo: string;
  gitBranch: string;
  rootDirectory: string;
}): Promise<string> {
  const data = await railwayGraphQL<{ serviceCreate: { id: string } }>(
    `mutation ServiceCreate($input: ServiceCreateInput!) {
      serviceCreate(input: $input) { id }
    }`,
    {
      input: {
        projectId: input.projectId,
        name: input.name,
        source: { repo: input.githubRepo },
        branch: input.gitBranch,
        rootDirectory: input.rootDirectory,
      },
    },
  );
  return data.serviceCreate.id;
}

async function upsertServiceVariables(input: {
  projectId: string;
  environmentId: string;
  serviceId: string;
  variables: Record<string, string>;
}): Promise<void> {
  await railwayGraphQL(
    `mutation VariableCollectionUpsert($input: VariableCollectionUpsertInput!) {
      variableCollectionUpsert(input: $input)
    }`,
    {
      input: {
        projectId: input.projectId,
        environmentId: input.environmentId,
        serviceId: input.serviceId,
        variables: input.variables,
      },
    },
  );
}

async function deployService(input: { serviceId: string; environmentId: string }): Promise<void> {
  await railwayGraphQL(
    `mutation ServiceInstanceDeploy($serviceId: String!, $environmentId: String!) {
      serviceInstanceDeploy(serviceId: $serviceId, environmentId: $environmentId)
    }`,
    input,
  );
}

async function getServiceDomain(serviceId: string): Promise<string> {
  const data = await railwayGraphQL<{
    service: { serviceInstances: { edges: Array<{ node: { domains: { serviceDomains: Array<{ domain: string }> } } }> } };
  }>(
    `query ServiceDomain($id: String!) {
      service(id: $id) {
        serviceInstances { edges { node { domains { serviceDomains { domain } } } } }
      }
    }`,
    { id: serviceId },
  );

  const domain = data.service.serviceInstances.edges[0]?.node.domains.serviceDomains[0]?.domain;
  if (!domain) throw new Error(`تعذّر إيجاد نطاق تلقائي لخدمة Railway ${serviceId}`);
  return `https://${domain}`;
}
