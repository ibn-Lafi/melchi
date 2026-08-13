-- إعدادات أساسية + دوال مساعدة تُستخدم لاحقًا بكل RLS Policies

create extension if not exists pgcrypto;

-- دور المستخدم يُقرأ من app_metadata وليس من الحقل العلوي 'role' بالـ JWT.
-- السبب: الحقل العلوي 'role' محجوز من Supabase/PostgREST للتبديل بين أدوار
-- قاعدة البيانات (anon/authenticated/service_role) — الكتابة فوقه بدور تطبيقي
-- (admin/accountant/rep) تكسر آلية PostgREST. لذلك نخزن الدور التطبيقي داخل
-- app_metadata (يُزامَن تلقائيًا من profiles.role عبر trigger، راجع الملف التالي).
create or replace function public.auth_role()
returns text
language sql
stable
as $$
  select nullif(auth.jwt() -> 'app_metadata' ->> 'role', '');
$$;

create or replace function public.auth_is_admin()
returns boolean
language sql
stable
as $$
  select public.auth_role() = 'admin';
$$;

create or replace function public.auth_is_admin_or_accountant()
returns boolean
language sql
stable
as $$
  select public.auth_role() in ('admin', 'accountant');
$$;

create or replace function public.auth_is_rep()
returns boolean
language sql
stable
as $$
  select public.auth_role() = 'rep';
$$;
