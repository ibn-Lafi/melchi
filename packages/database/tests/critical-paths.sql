-- اختبار تكامل شامل للمسارات الحرجة (راجع CLAUDE.md §9). يطبَّق بعد migrations/
-- على قاعدة بيانات اختبار فارغة، ويفشل (exit code != 0) عند أي RAISE EXCEPTION.
-- هذا ليس Mock — يُنفَّذ فعليًا على Postgres حقيقي بنفس مخطط الإنتاج.
--
-- ملاحظة تقنية: psql لا يستبدل متغيراته (:'name') داخل نصوص $$...$$ (DO
-- blocks/دوال)، لذلك أي تحقق يحتاج متغيّر psql (مثل invoice_id الناتج من
-- \gset) يُكتب كاستدعاء SELECT مباشر لدالة pg_temp.assert_true أدناه، وليس
-- داخل DO block.

\set ON_ERROR_STOP on

create function pg_temp.assert_true(p_condition boolean, p_message text)
returns void language plpgsql as $$
begin
  if not p_condition or p_condition is null then
    raise exception 'FAILED: %', p_message;
  end if;
end;
$$;

-- ========== الإعداد ==========
insert into auth.users (id, raw_user_meta_data)
values
  ('11111111-1111-1111-1111-111111111111', '{"name":"Admin One","role":"admin"}'),
  ('22222222-2222-2222-2222-222222222222', '{"name":"Rep One","role":"rep"}');

select pg_temp.assert_true(
  (select count(*) from public.profiles where role = 'admin') = 1,
  'trigger on_auth_user_created لم ينشئ profile للأدمن'
);
select pg_temp.assert_true(
  (select count(*) from public.profiles where role = 'rep') = 1,
  'trigger on_auth_user_created لم ينشئ profile للمندوب'
);

update public.system_settings
set company_name = 'شركة الاختبار', vat_registration_number = '300000000000003'
where id = 1;

set request.jwt.uid = '11111111-1111-1111-1111-111111111111';
set request.jwt.claims = '{"role":"authenticated","app_metadata":{"role":"admin"}}';

insert into public.units (id, name) values
  ('a1111111-0000-0000-0000-000000000001', 'قطعة'),
  ('a1111111-0000-0000-0000-000000000002', 'كرتون');
insert into public.categories (id, name) values ('c1111111-0000-0000-0000-000000000001', 'مشروبات');
insert into public.products (id, name, price, category_id, base_unit_id, visible_in_store)
values ('b1111111-0000-0000-0000-000000000001', 'عصير برتقال', 5.00,
        'c1111111-0000-0000-0000-000000000001', 'a1111111-0000-0000-0000-000000000001', true);
insert into public.product_units (product_id, unit_id, conversion_factor_to_base)
values ('b1111111-0000-0000-0000-000000000001', 'a1111111-0000-0000-0000-000000000002', 24);
insert into public.suppliers (id, name) values ('d1111111-0000-0000-0000-000000000001', 'مورد تجريبي');

-- ========== 1. المتوسط المرجّح (requirements.md §5.4) ==========
select public.create_purchase_invoice(
  'd1111111-0000-0000-0000-000000000001',
  jsonb_build_array(jsonb_build_object(
    'product_id', 'b1111111-0000-0000-0000-000000000001',
    'unit_id', 'a1111111-0000-0000-0000-000000000002',
    'quantity_in_unit', 10, 'unit_cost', 100
  )), 'unpaid'
);

select pg_temp.assert_true(
  (select round(average_cost, 4) from public.products where id = 'b1111111-0000-0000-0000-000000000001') = 4.1667,
  'متوسط التكلفة بعد أول شراء يجب أن يكون 4.1667'
);
select pg_temp.assert_true(
  (select quantity_available from public.warehouse_stock where product_id = 'b1111111-0000-0000-0000-000000000001') = 240,
  'رصيد المخزن المركزي بعد أول شراء يجب أن يكون 240'
);

select public.create_purchase_invoice(
  'd1111111-0000-0000-0000-000000000001',
  jsonb_build_array(jsonb_build_object(
    'product_id', 'b1111111-0000-0000-0000-000000000001',
    'unit_id', 'a1111111-0000-0000-0000-000000000002',
    'quantity_in_unit', 5, 'unit_cost', 120
  )), 'paid'
);

select pg_temp.assert_true(
  (select round(average_cost, 4) from public.products where id = 'b1111111-0000-0000-0000-000000000001') = 4.4445,
  'متوسط التكلفة بعد شراء ثانٍ بسعر مختلف يجب أن يكون 4.4445'
);
select pg_temp.assert_true(
  (select quantity_available from public.warehouse_stock where product_id = 'b1111111-0000-0000-0000-000000000001') = 360,
  'رصيد المخزن المركزي بعد شراءين يجب أن يكون 360'
);

-- ========== 2. نقل بضاعة للمندوب (requirements.md §6.2) ==========
select public.transfer_stock_to_rep(
  '22222222-2222-2222-2222-222222222222',
  jsonb_build_array(jsonb_build_object('product_id', 'b1111111-0000-0000-0000-000000000001', 'quantity', 100))
);

select pg_temp.assert_true(
  (select quantity_available from public.warehouse_stock where product_id = 'b1111111-0000-0000-0000-000000000001') = 260,
  'رصيد المخزن بعد نقل 100 قطعة يجب أن يكون 260'
);
select pg_temp.assert_true(
  (select quantity_available from public.rep_inventory
    where rep_id = '22222222-2222-2222-2222-222222222222' and product_id = 'b1111111-0000-0000-0000-000000000001') = 100,
  'رصيد المندوب بعد النقل يجب أن يكون 100'
);

insert into public.customers (id, name, shop_name, show_in_store, google_maps_link)
values ('e1111111-0000-0000-0000-000000000001', 'عميل تجريبي', 'محل الاختبار', true, 'https://maps.google.com/xyz');
insert into public.customer_reps (customer_id, rep_id)
values ('e1111111-0000-0000-0000-000000000001', '22222222-2222-2222-2222-222222222222');

-- ========== 3. فاتورة بيع + VAT 15% + خصم مخزون (requirements.md §7.3/§7.5) ==========
set request.jwt.uid = '22222222-2222-2222-2222-222222222222';
set request.jwt.claims = '{"role":"authenticated","app_metadata":{"role":"rep"}}';

select public.create_invoice_with_stock_check(
  '22222222-2222-2222-2222-222222222222',
  'e1111111-0000-0000-0000-000000000001',
  jsonb_build_array(jsonb_build_object(
    'product_id', 'b1111111-0000-0000-0000-000000000001',
    'unit_id', 'a1111111-0000-0000-0000-000000000001',
    'quantity_in_unit', 20, 'unit_price', 5
  )), 'credit'
) as invoice_id \gset invoice1_

select pg_temp.assert_true(
  (select invoice_number from public.invoices where id = :'invoice1_invoice_id') = 1,
  'invoice_number الأول يجب أن يكون 1'
);
select pg_temp.assert_true(
  (select (subtotal, vat_amount, total_amount) = (100, 15, 115)
     from public.invoices where id = :'invoice1_invoice_id'),
  'مجاميع الفاتورة (subtotal/vat/total) يجب أن تكون 100/15/115'
);
select pg_temp.assert_true(
  (select status from public.invoices where id = :'invoice1_invoice_id') = 'unpaid',
  'حالة فاتورة آجلة عند الإصدار يجب أن تكون unpaid'
);
select pg_temp.assert_true(
  (select length(qr_code_data) > 0 from public.invoices where id = :'invoice1_invoice_id'),
  'qr_code_data يجب ألا يكون فارغًا'
);
select pg_temp.assert_true(
  (select quantity_available from public.rep_inventory
    where rep_id = '22222222-2222-2222-2222-222222222222' and product_id = 'b1111111-0000-0000-0000-000000000001') = 80,
  'رصيد المندوب بعد بيع 20 قطعة يجب أن يكون 80'
);

-- ========== 4. رفض بيع كمية أكبر من المتاح (requirements.md §7.3) ==========
do $$
begin
  perform public.create_invoice_with_stock_check(
    '22222222-2222-2222-2222-222222222222',
    'e1111111-0000-0000-0000-000000000001',
    jsonb_build_array(jsonb_build_object(
      'product_id', 'b1111111-0000-0000-0000-000000000001',
      'unit_id', 'a1111111-0000-0000-0000-000000000001',
      'quantity_in_unit', 99999, 'unit_price', 5
    )), 'cash'
  );
  raise exception 'كان يجب رفض بيع كمية أكبر من رصيد المندوب';
exception
  when others then
    if sqlerrm = 'كان يجب رفض بيع كمية أكبر من رصيد المندوب' then
      raise exception 'FAILED: %', sqlerrm;
    end if;
    -- أي استثناء آخر متوقع من create_invoice_with_stock_check نفسها — هذا صحيح
end $$;

-- ========== 5. تحصيل جزئي/كامل يحدّث حالة الفاتورة تلقائيًا (requirements.md §11) ==========
select public.record_customer_payment(
  'e1111111-0000-0000-0000-000000000001', :'invoice1_invoice_id', 50, 'cash'
);
select pg_temp.assert_true(
  (select status from public.invoices where id = :'invoice1_invoice_id') = 'partial',
  'حالة الفاتورة بعد تحصيل جزئي يجب أن تكون partial'
);

select public.record_customer_payment(
  'e1111111-0000-0000-0000-000000000001', :'invoice1_invoice_id', 65, 'cash'
);
select pg_temp.assert_true(
  (select status from public.invoices where id = :'invoice1_invoice_id') = 'paid',
  'حالة الفاتورة بعد اكتمال التحصيل يجب أن تكون paid'
);

-- ========== 6. مرتجع: سليم يرجع للمخزون، تالف يُسجَّل خسارة فقط (requirements.md §10.2) ==========
select public.process_return(
  'e1111111-0000-0000-0000-000000000001',
  :'invoice1_invoice_id',
  '22222222-2222-2222-2222-222222222222',
  jsonb_build_array(
    jsonb_build_object('product_id', 'b1111111-0000-0000-0000-000000000001', 'quantity', 5, 'unit_price', 5, 'condition', 'resalable'),
    jsonb_build_object('product_id', 'b1111111-0000-0000-0000-000000000001', 'quantity', 2, 'unit_price', 5, 'condition', 'damaged')
  )
);

select pg_temp.assert_true(
  (select quantity_available from public.rep_inventory
    where rep_id = '22222222-2222-2222-2222-222222222222' and product_id = 'b1111111-0000-0000-0000-000000000001') = 85,
  'رصيد المندوب بعد المرتجع يجب أن يكون 85 (80+5 سليم، بدون التالف)'
);
select pg_temp.assert_true(
  (select quantity_change from public.stock_movements where movement_type = 'write_off' limit 1) = -2,
  'حركة write_off يجب أن تسجّل الكمية الفعلية المفقودة (-2) وليس صفر'
);

-- ========== 7. إلغاء فاتورة بفترة السماح + إشعار دائن (requirements.md §7.7) ==========
select public.cancel_invoice_within_grace_period(:'invoice1_invoice_id', 'خطأ إدخال');

select pg_temp.assert_true(
  (select status from public.invoices where id = :'invoice1_invoice_id') = 'cancelled',
  'حالة الفاتورة بعد الإلغاء يجب أن تكون cancelled'
);
select pg_temp.assert_true(
  (select count(*) from public.credit_notes where invoice_id = :'invoice1_invoice_id') = 1,
  'يجب إنشاء إشعار دائن واحد بالضبط عند الإلغاء'
);

-- ========== 8. RLS لكل دور (CLAUDE.md §4-5) ==========
reset role;
set request.jwt.uid = '22222222-2222-2222-2222-222222222222';
set request.jwt.claims = '{"role":"authenticated","app_metadata":{"role":"rep"}}';
set role authenticated;

select pg_temp.assert_true(
  (select count(*) from public.suppliers) = 0,
  'المندوب لا يجب أن يرى أي مورد (RLS)'
);
select pg_temp.assert_true(
  (select count(*) from public.customers) = 1,
  'المندوب يجب أن يرى عميله المرتبط فقط (RLS)'
);

reset role;
set request.jwt.uid = '11111111-1111-1111-1111-111111111111';
set request.jwt.claims = '{"role":"authenticated","app_metadata":{"role":"admin"}}';
set role authenticated;

select pg_temp.assert_true(
  (select count(*) from public.suppliers) = 1,
  'الأدمن يجب أن يرى كل الموردين (RLS)'
);

reset role;
set request.jwt.claims = '';
set role anon;

select pg_temp.assert_true(
  (select count(*) from public.customers) = 0,
  'anon لا يجب أن يصل لجدول customers مباشرة إطلاقًا (RLS)'
);
select pg_temp.assert_true(
  (select count(*) from public.public_store_locations) = 1,
  'anon يجب أن يرى نقطة البيع الظاهرة عبر public_store_locations'
);
select pg_temp.assert_true(
  (select count(*) from public.public_products) = 1,
  'anon يجب أن يرى المنتج الظاهر بالمتجر عبر public_products'
);

reset role;

\echo '✓ كل اختبارات المسارات الحرجة نجحت'
