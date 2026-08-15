-- ========== نسبة خصم تفاوضية على مستوى الفاتورة (0% - 25%) ==========
-- المندوب يتفق مع العميل على نسبة خصم عن سعر الكتالوج (حد أقصى 25%). يجب
-- عدم الثقة بسعر يُرسله تطبيق المندوب مباشرة (راجع CLAUDE.md §5 بند 10):
-- الدالة تتجاهل أي "unit_price" قادم من العميل وتحسب السعر الفعلي داخل
-- قاعدة البيانات من سعر الكتالوج الحقيقي (products.price / product_units)
-- مطروحًا منه نسبة الخصم. المتجر العام (store) لا يتأثر إطلاقًا لأنه يقرأ
-- products.price مباشرة ولا علاقة له بالفواتير.

alter table public.invoices
  add column discount_percentage numeric(5, 2) not null default 0
    check (discount_percentage >= 0 and discount_percentage <= 25);

-- إضافة p_discount_percentage تغيّر توقيع الدالة (عدد المعاملات) — CREATE OR
-- REPLACE لا يستبدل دالة بتوقيع مختلف حتى لو المعامل الجديد له قيمة
-- افتراضية، بل يُنشئ دالة إضافية (overload) فيصير الاستدعاء بـ 4 معاملات
-- غامضًا (ambiguous) بين النسختين. يجب حذف التوقيع القديم صراحة أولًا.
drop function if exists public.create_invoice_with_stock_check(
  uuid, uuid, jsonb, public.invoice_payment_method
);

create or replace function public.create_invoice_with_stock_check(
  p_rep_id uuid,
  p_customer_id uuid,
  p_items jsonb, -- [{product_id, unit_id, quantity_in_unit}, ...] — unit_price لم يعد يُقرأ من هنا
  p_payment_method public.invoice_payment_method,
  p_discount_percentage numeric default 0
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_item jsonb;
  v_product_id uuid;
  v_unit_id uuid;
  v_quantity_in_unit numeric;
  v_conversion_factor numeric;
  v_quantity_in_base numeric;
  v_list_price numeric;
  v_unit_price numeric;
  v_cost_price numeric;
  v_available numeric;
  v_subtotal numeric := 0;
  v_vat_amount numeric;
  v_total_amount numeric;
  v_invoice_id uuid := gen_random_uuid();
  v_invoice_number bigint;
  v_qr text;
  v_settings public.system_settings;
  v_now timestamptz := now();
begin
  if not (public.auth_is_admin() or (public.auth_is_rep() and p_rep_id = auth.uid())) then
    raise exception 'غير مصرح لك بإصدار فاتورة نيابة عن مندوب آخر';
  end if;

  if p_items is null or jsonb_array_length(p_items) = 0 then
    raise exception 'يجب إضافة بند واحد على الأقل للفاتورة';
  end if;

  if p_discount_percentage is null or p_discount_percentage < 0 or p_discount_percentage > 25 then
    raise exception 'نسبة الخصم يجب أن تكون بين 0%% و 25%%';
  end if;

  select * into v_settings from public.system_settings where id = 1;

  -- 1. تحقق أن كل الكميات المطلوبة متوفرة بالمخزون المشترك (بالوحدة
  --    الأساسية) قبل أي تعديل فعلي — راجع النمط الإلزامي بـ CLAUDE.md §4.3
  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_product_id := (v_item ->> 'product_id')::uuid;
    v_unit_id := (v_item ->> 'unit_id')::uuid;
    v_quantity_in_unit := (v_item ->> 'quantity_in_unit')::numeric;

    if v_quantity_in_unit is null or v_quantity_in_unit <= 0 then
      raise exception 'الكمية يجب أن تكون أكبر من صفر';
    end if;

    select conversion_factor_to_base into v_conversion_factor
    from public.product_units
    where product_id = v_product_id and unit_id = v_unit_id;

    if v_conversion_factor is null then
      select 1 into v_conversion_factor
      from public.products
      where id = v_product_id and base_unit_id = v_unit_id;
    end if;

    if v_conversion_factor is null then
      raise exception 'الوحدة المختارة غير مرتبطة بهذا المنتج';
    end if;

    v_quantity_in_base := v_quantity_in_unit * v_conversion_factor;

    select quantity_available into v_available
    from public.warehouse_stock
    where product_id = v_product_id
    for update;

    if v_available is null or v_available < v_quantity_in_base then
      raise exception 'الكمية غير متوفرة بالمخزون لمنتج %', v_product_id;
    end if;
  end loop;

  -- 2. حساب المجاميع: سعر الكتالوج الحقيقي (من قاعدة البيانات، وليس من
  --    العميل) مطروحًا منه نسبة الخصم، ثم ضريبة القيمة المضافة (15%)
  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_product_id := (v_item ->> 'product_id')::uuid;
    v_unit_id := (v_item ->> 'unit_id')::uuid;
    v_quantity_in_unit := (v_item ->> 'quantity_in_unit')::numeric;

    select coalesce(pu.unit_price, p.price * pu.conversion_factor_to_base, p.price)
      into v_list_price
    from public.products p
    left join public.product_units pu on pu.product_id = p.id and pu.unit_id = v_unit_id
    where p.id = v_product_id;

    v_unit_price := round(v_list_price * (1 - p_discount_percentage / 100), 2);
    v_subtotal := v_subtotal + (v_quantity_in_unit * v_unit_price);
  end loop;
  v_vat_amount := round(v_subtotal * 0.15, 2);
  v_total_amount := v_subtotal + v_vat_amount;

  v_invoice_number := nextval('public.invoice_number_seq');
  v_qr := public.generate_zatca_qr(
    coalesce(v_settings.company_name, ''),
    coalesce(v_settings.vat_registration_number, ''),
    v_now,
    v_total_amount,
    v_vat_amount
  );

  insert into public.invoices (
    id, invoice_number, rep_id, customer_id, invoice_date,
    subtotal, vat_amount, total_amount, qr_code_data, payment_method, status,
    discount_percentage
  ) values (
    v_invoice_id, v_invoice_number, p_rep_id, p_customer_id, v_now,
    v_subtotal, v_vat_amount, v_total_amount, v_qr, p_payment_method,
    case when p_payment_method = 'credit' then 'unpaid'::public.invoice_status else 'paid'::public.invoice_status end,
    p_discount_percentage
  );

  -- 3. بنود الفاتورة + خصم المخزون المشترك + حركة مخزون sale_out (كلها بنفس الـ transaction)
  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_product_id := (v_item ->> 'product_id')::uuid;
    v_unit_id := (v_item ->> 'unit_id')::uuid;
    v_quantity_in_unit := (v_item ->> 'quantity_in_unit')::numeric;

    select conversion_factor_to_base into v_conversion_factor
    from public.product_units
    where product_id = v_product_id and unit_id = v_unit_id;
    v_conversion_factor := coalesce(v_conversion_factor, 1);
    v_quantity_in_base := v_quantity_in_unit * v_conversion_factor;

    select coalesce(pu.unit_price, p.price * pu.conversion_factor_to_base, p.price)
      into v_list_price
    from public.products p
    left join public.product_units pu on pu.product_id = p.id and pu.unit_id = v_unit_id
    where p.id = v_product_id;
    v_unit_price := round(v_list_price * (1 - p_discount_percentage / 100), 2);

    select average_cost into v_cost_price from public.products where id = v_product_id;

    insert into public.invoice_items (
      invoice_id, product_id, unit_id, quantity_in_unit, quantity_in_base_unit,
      unit_price, cost_price, subtotal
    ) values (
      v_invoice_id, v_product_id, v_unit_id, v_quantity_in_unit, v_quantity_in_base,
      v_unit_price, coalesce(v_cost_price, 0), v_quantity_in_unit * v_unit_price
    );

    update public.warehouse_stock
    set quantity_available = quantity_available - v_quantity_in_base
    where product_id = v_product_id
    returning quantity_available into v_available;

    insert into public.stock_movements (
      movement_type, reference_table, reference_id, product_id,
      location_type, location_id, quantity_change, balance_after, performed_by
    ) values (
      'sale_out', 'invoices', v_invoice_id, v_product_id,
      'warehouse', null, -v_quantity_in_base, v_available, auth.uid()
    );
  end loop;

  return v_invoice_id;
end;
$$;
