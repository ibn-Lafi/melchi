-- ========== tenants: كل عميل SaaS مسجَّل ==========
create table public.tenants (
  id uuid primary key default gen_random_uuid(),
  company_name text not null,
  contact_name text not null,
  contact_email text not null,
  status text not null default 'pending' check (status in ('pending', 'active', 'suspended', 'cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_updated_at before update on public.tenants
  for each row execute function public.set_updated_at();

-- ========== tenant_provisioning_runs: كل محاولة تزويد لعميل (يمكن إعادة المحاولة) ==========
create table public.tenant_provisioning_runs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id),
  status text not null default 'in_progress' check (status in ('in_progress', 'succeeded', 'failed')),
  current_step text,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  last_error text,
  retry_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_updated_at before update on public.tenant_provisioning_runs
  for each row execute function public.set_updated_at();

create index tenant_provisioning_runs_tenant_id_idx on public.tenant_provisioning_runs (tenant_id);

-- ========== tenant_provisioning_steps: سجل تدقيق تفصيلي لكل خطوة بكل محاولة ==========
-- ضروري لأن استدعاءات Supabase Management API / Railway API ستفشل أحيانًا،
-- ويجب أن يكون الفشل مرئيًا وقابلًا للتشخيص (نص الخطأ الكامل) وليس صامتًا.
create table public.tenant_provisioning_steps (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.tenant_provisioning_runs (id),
  step_name text not null check (
    step_name in (
      'create_supabase_project',
      'wait_project_ready',
      'run_migrations',
      'create_first_admin',
      'create_railway_services',
      'trigger_deploys',
      'send_welcome_email'
    )
  ),
  status text not null default 'pending' check (status in ('pending', 'in_progress', 'succeeded', 'failed', 'skipped')),
  started_at timestamptz,
  finished_at timestamptz,
  error_detail text,
  created_at timestamptz not null default now()
);

create index tenant_provisioning_steps_run_id_idx on public.tenant_provisioning_steps (run_id);

-- ========== tenant_infrastructure: مراجع البنية التحتية المزوَّدة فعليًا لكل عميل ==========
-- ملاحظة أمان: لا يُخزَّن هنا مفتاح service_role الخاص بمشروع العميل إطلاقًا —
-- يُستخدم فقط لحظيًا أثناء التزويد (لإنشاء أول أدمن) ثم يُكتب مباشرة كمتغير
-- بيئة بخدمة Railway الخاصة بالعميل، دون أي تخزين دائم بقاعدة بيانات لوحة
-- التحكم نفسها. anon key مخزَّن لأنه مصمَّم أصلًا ليكون عامًا (NEXT_PUBLIC_).
create table public.tenant_infrastructure (
  tenant_id uuid primary key references public.tenants (id),
  supabase_project_ref text,
  supabase_project_url text,
  supabase_anon_key text,
  railway_project_id text,
  railway_service_id_admin text,
  railway_service_id_rep text,
  railway_service_id_store text,
  admin_app_url text,
  rep_app_url text,
  store_app_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_updated_at before update on public.tenant_infrastructure
  for each row execute function public.set_updated_at();

-- ========== tenant_billing: بيانات الفوترة (Stripe) — تُملأ بـ Phase 3 ==========
create table public.tenant_billing (
  tenant_id uuid primary key references public.tenants (id),
  stripe_customer_id text,
  stripe_subscription_id text,
  plan text,
  status text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_updated_at before update on public.tenant_billing
  for each row execute function public.set_updated_at();

-- ========== RLS: رفض افتراضي تام لـ anon/authenticated بكل الجداول ==========
-- لا سياسات SELECT/INSERT/UPDATE/DELETE لأي منهما — الوصول الوحيد المسموح هو
-- عبر service_role من كود سيرفر فقط (لوحة التحكم لا تُعرض بياناتها لأي مستخدم
-- نهائي عبر anon/authenticated بهذه المرحلة). service_role يتجاوز RLS تلقائيًا
-- بإعداد Supabase الافتراضي، فتفعيل RLS بدون أي policy هنا يحقق "الرفض
-- الافتراضي" المطلوب بـ CLAUDE.md مع بقاء الوصول الإداري الداخلي ممكنًا.
alter table public.tenants enable row level security;
alter table public.tenant_provisioning_runs enable row level security;
alter table public.tenant_provisioning_steps enable row level security;
alter table public.tenant_infrastructure enable row level security;
alter table public.tenant_billing enable row level security;
