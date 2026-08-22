-- محاكاة الحد الأدنى من أدوار Supabase (anon/authenticated/service_role)
-- للاختبار المحلي/CI فقط — ليست جزءًا من migrations الفعلية. بخلاف
-- packages/database، قاعدة بيانات control-plane لا تستخدم Supabase
-- Auth أو Storage إطلاقًا بهذه المرحلة، فلا حاجة لمحاكاة auth.users أو
-- storage schema هنا.
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

grant usage on schema public to anon, authenticated, service_role;
alter default privileges in schema public grant select on tables to anon, authenticated;
