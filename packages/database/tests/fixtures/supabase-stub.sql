-- محاكاة الحد الأدنى من بيئة Supabase (auth schema) للاختبار المحلي/CI فقط.
-- ليست جزءًا من migrations الفعلية — لا تُطبَّق أبدًا على مشروع Supabase حقيقي.

-- أدوار Supabase الافتراضية (anon/authenticated/service_role) موجودة تلقائيًا
-- بأي مشروع Supabase حقيقي، لكن غير موجودة بـ postgres عادي (محلي أو CI) —
-- لازم إنشاؤها هنا صراحة وإلا تفشل كل GRANT التالية.
do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then
    create role anon nologin;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then
    create role authenticated nologin;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then
    create role service_role nologin bypassrls;
  end if;
end $$;

create schema if not exists auth;

create table auth.users (
  id uuid primary key default gen_random_uuid(),
  email text,
  raw_user_meta_data jsonb not null default '{}'::jsonb,
  raw_app_meta_data jsonb not null default '{}'::jsonb
);

create or replace function auth.uid() returns uuid
language sql stable
as $$ select nullif(current_setting('request.jwt.uid', true), '')::uuid; $$;

create or replace function auth.jwt() returns jsonb
language sql stable
as $$ select nullif(current_setting('request.jwt.claims', true), '')::jsonb; $$;

grant usage on schema auth to anon, authenticated, service_role;
grant select on auth.users to anon, authenticated, service_role;
grant usage on schema public to anon, authenticated, service_role;
alter default privileges in schema public grant select on tables to anon, authenticated;

-- محاكاة الحد الأدنى من مخطط storage (Supabase Storage) — لاختبار
-- migrations اللي تنشئ bucket/policies على storage.objects محليًا فقط.
create schema if not exists storage;

create table storage.buckets (
  id text primary key,
  name text not null,
  public boolean not null default false
);

create table storage.objects (
  id uuid primary key default gen_random_uuid(),
  bucket_id text references storage.buckets (id),
  name text,
  owner uuid,
  created_at timestamptz not null default now()
);
alter table storage.objects enable row level security;

grant usage on schema storage to anon, authenticated, service_role;
grant select on storage.buckets to anon, authenticated, service_role;
grant select, insert, update, delete on storage.objects to anon, authenticated, service_role;
