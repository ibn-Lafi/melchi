-- اختبار تكامل لمسارات control-plane الحرجة: نموذج بيانات التزويد والفوترة،
-- وسلوك RLS الرافض افتراضيًا. يُطبَّق بعد db/migrations/ على قاعدة اختبار
-- فارغة، ويفشل (exit code != 0) عند أي RAISE EXCEPTION.

\set ON_ERROR_STOP on

create function pg_temp.assert_true(p_condition boolean, p_message text)
returns void language plpgsql as $$
begin
  if not p_condition or p_condition is null then
    raise exception 'FAILED: %', p_message;
  end if;
end;
$$;

-- ========== إنشاء عميل + تشغيل تزويد + خطواته ==========
insert into public.tenants (id, company_name, contact_name, contact_email)
values ('11111111-1111-1111-1111-111111111111', 'شركة الاختبار', 'مدير الاختبار', 'owner@test.local');

select pg_temp.assert_true(
  (select status from public.tenants where id = '11111111-1111-1111-1111-111111111111') = 'pending',
  'العميل الجديد يجب أن تكون حالته الافتراضية pending'
);

insert into public.tenant_provisioning_runs (id, tenant_id, current_step)
values ('22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'create_supabase_project');

insert into public.tenant_provisioning_steps (run_id, step_name, status)
values ('22222222-2222-2222-2222-222222222222', 'create_supabase_project', 'succeeded');

select pg_temp.assert_true(
  (select count(*) from public.tenant_provisioning_steps
   where run_id = '22222222-2222-2222-2222-222222222222' and status = 'succeeded') = 1,
  'خطوة create_supabase_project لم تُسجَّل بشكل صحيح'
);

-- step_name غير معروف يجب أن يُرفض بواسطة check constraint
do $$
begin
  begin
    insert into public.tenant_provisioning_steps (run_id, step_name)
    values ('22222222-2222-2222-2222-222222222222', 'not_a_real_step');
    raise exception 'FAILED: check constraint لم يرفض step_name غير صالح';
  exception
    when check_violation then
      null; -- متوقَّع
  end;
end $$;

-- ========== tenant_infrastructure / tenant_billing ==========
insert into public.tenant_infrastructure (tenant_id, supabase_project_ref, admin_app_url, rep_app_url, store_app_url)
values (
  '11111111-1111-1111-1111-111111111111',
  'abcdefghijklmnop',
  'https://admin-test.up.railway.app',
  'https://rep-test.up.railway.app',
  'https://store-test.up.railway.app'
);

insert into public.tenant_billing (tenant_id, stripe_customer_id, plan, status)
values ('11111111-1111-1111-1111-111111111111', 'cus_test123', 'standard', 'active');

select pg_temp.assert_true(
  (select supabase_project_ref from public.tenant_infrastructure
   where tenant_id = '11111111-1111-1111-1111-111111111111') = 'abcdefghijklmnop',
  'tenant_infrastructure لم يُحفظ بشكل صحيح'
);

-- FK يجب أن يرفض tenant_id غير موجود
do $$
begin
  begin
    insert into public.tenant_billing (tenant_id, plan)
    values ('99999999-9999-9999-9999-999999999999', 'standard');
    raise exception 'FAILED: FK لم يرفض tenant_id غير موجود بجدول tenant_billing';
  exception
    when foreign_key_violation then
      null; -- متوقَّع
  end;
end $$;

-- ========== trigger set_updated_at ==========
update public.tenants set status = 'active' where id = '11111111-1111-1111-1111-111111111111';

select pg_temp.assert_true(
  (select updated_at > created_at from public.tenants where id = '11111111-1111-1111-1111-111111111111'),
  'trigger set_updated_at لم يحدّث updated_at بجدول tenants'
);

-- ========== RLS: رفض تام لـ anon/authenticated بدون أي policy ==========
set role anon;

select pg_temp.assert_true(
  (select count(*) from public.tenants) = 0,
  'anon لا يجب أن يرى أي صف بجدول tenants (لا policy مسموحة)'
);

reset role;
set role authenticated;

select pg_temp.assert_true(
  (select count(*) from public.tenants) = 0,
  'authenticated لا يجب أن يرى أي صف بجدول tenants (لا policy مسموحة)'
);

reset role;

select 'كل اختبارات control-plane الحرجة نجحت' as result;
