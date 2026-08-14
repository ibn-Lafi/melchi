-- ========== نموذج مخزن واحد موحّد (إلغاء نظام نقل البضاعة للمناديب) ==========
-- قرار عمل: النظام بالكامل (الأدمن + كل المناديب) له مخزون مركزي واحد
-- مشترك (warehouse_stock) بدل تخصيص كميات منفصلة لكل مندوب عبر
-- rep_inventory + transfer_stock_to_rep(). كل عملية بيع تخصم مباشرة من
-- warehouse_stock بغض النظر عن هوية المندوب الذي أصدر الفاتورة، وكل
-- مرتجع سليم يعيد الكمية لنفس المخزون المشترك.
--
-- الجداول rep_inventory / stock_transfers / stock_transfer_items تبقى
-- بالمخطط (لا حذف — تحافظ على السجل التاريخي لما قبل هذا التغيير) لكنها
-- لم تعد تُستخدم من أي مسار بالتطبيق بعد هذا الترحيل.

-- ========== 1) دمج أي أرصدة قائمة بـ rep_inventory رجوعًا لـ warehouse_stock ==========
-- بدون فقدان أي بضاعة — يُسجَّل كحركة "adjustment" موثّقة بسجل stock_movements.
do $$
declare
  v_row record;
  v_new_qty numeric;
  v_batch_id uuid := gen_random_uuid();
begin
  for v_row in
    select product_id, sum(quantity_available) as qty
    from public.rep_inventory
    where quantity_available > 0
    group by product_id
  loop
    insert into public.warehouse_stock (product_id, quantity_available)
    values (v_row.product_id, v_row.qty)
    on conflict (product_id)
    do update set quantity_available = public.warehouse_stock.quantity_available + excluded.quantity_available
    returning quantity_available into v_new_qty;

    insert into public.stock_movements (
      movement_type, reference_table, reference_id, product_id,
      location_type, location_id, quantity_change, balance_after, performed_by
    ) values (
      'adjustment', 'rep_inventory', v_batch_id, v_row.product_id,
      'warehouse', null, v_row.qty, v_new_qty, null
    );
  end loop;

  update public.rep_inventory set quantity_available = 0 where quantity_available > 0;
end $$;

-- ========== 2) RLS: المناديب يحتاجون رؤية المخزون المشترك (قراءة فقط) ==========
drop policy if exists "warehouse_stock_select_rep" on public.warehouse_stock;
create policy "warehouse_stock_select_rep"
on public.warehouse_stock for select
using (public.auth_is_rep());

-- ========== 3) إصدار فاتورة بيع — خصم مباشر من warehouse_stock ==========
create or replace function public.create_invoice_with_stock_check(
  p_rep_id uuid,
  p_customer_id uuid,
  p_items jsonb, -- [{product_id, unit_id, quantity_in_unit, unit_price}, ...]
  p_payment_method public.invoice_payment_method
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

  -- 2. حساب المجاميع والضريبة (15%)
  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_subtotal := v_subtotal
      + ((v_item ->> 'quantity_in_unit')::numeric * (v_item ->> 'unit_price')::numeric);
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
    subtotal, vat_amount, total_amount, qr_code_data, payment_method, status
  ) values (
    v_invoice_id, v_invoice_number, p_rep_id, p_customer_id, v_now,
    v_subtotal, v_vat_amount, v_total_amount, v_qr, p_payment_method,
    case when p_payment_method = 'credit' then 'unpaid'::public.invoice_status else 'paid'::public.invoice_status end
  );

  -- 3. بنود الفاتورة + خصم المخزون المشترك + حركة مخزون sale_out (كلها بنفس الـ transaction)
  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_product_id := (v_item ->> 'product_id')::uuid;
    v_unit_id := (v_item ->> 'unit_id')::uuid;
    v_quantity_in_unit := (v_item ->> 'quantity_in_unit')::numeric;
    v_unit_price := (v_item ->> 'unit_price')::numeric;

    select conversion_factor_to_base into v_conversion_factor
    from public.product_units
    where product_id = v_product_id and unit_id = v_unit_id;
    v_conversion_factor := coalesce(v_conversion_factor, 1);
    v_quantity_in_base := v_quantity_in_unit * v_conversion_factor;

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

-- ========== 4) تسجيل مرتجع — الكمية السليمة ترجع للمخزون المشترك ==========
create or replace function public.process_return(
  p_customer_id uuid,
  p_invoice_id uuid,
  p_rep_id uuid,
  p_items jsonb -- [{product_id, quantity, unit_price, condition}, ...]
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_item jsonb;
  v_product_id uuid;
  v_quantity numeric;
  v_unit_price numeric;
  v_condition public.return_condition;
  v_total_credit numeric := 0;
  v_return_id uuid := gen_random_uuid();
  v_warehouse_qty numeric;
  v_is_authorized boolean;
begin
  select public.auth_is_admin() or (public.auth_is_rep() and p_rep_id = auth.uid())
  into v_is_authorized;

  if not v_is_authorized then
    raise exception 'غير مصرح لك بتسجيل مرتجع';
  end if;

  if p_items is null or jsonb_array_length(p_items) = 0 then
    raise exception 'يجب إضافة بند واحد على الأقل بالمرتجع';
  end if;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_total_credit := v_total_credit
      + ((v_item ->> 'quantity')::numeric * (v_item ->> 'unit_price')::numeric);
  end loop;

  insert into public.return_records (
    id, invoice_id, customer_id, rep_id, total_credit_amount, created_by
  ) values (
    v_return_id, p_invoice_id, p_customer_id, p_rep_id, v_total_credit, auth.uid()
  );

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_product_id := (v_item ->> 'product_id')::uuid;
    v_quantity := (v_item ->> 'quantity')::numeric;
    v_unit_price := (v_item ->> 'unit_price')::numeric;
    v_condition := (v_item ->> 'condition')::public.return_condition;

    insert into public.return_items (return_id, product_id, quantity, unit_price, condition)
    values (v_return_id, v_product_id, v_quantity, v_unit_price, v_condition);

    if v_condition = 'resalable' then
      insert into public.warehouse_stock (product_id, quantity_available)
      values (v_product_id, v_quantity)
      on conflict (product_id)
      do update set quantity_available = public.warehouse_stock.quantity_available + excluded.quantity_available
      returning quantity_available into v_warehouse_qty;

      insert into public.stock_movements (
        movement_type, reference_table, reference_id, product_id,
        location_type, location_id, quantity_change, balance_after, performed_by
      ) values (
        'return_in', 'return_records', v_return_id, v_product_id,
        'warehouse', null, v_quantity, v_warehouse_qty, auth.uid()
      );
    else
      -- تالف/منتهي الصلاحية: خسارة موثّقة بدون أي إضافة لمخزون قابل للبيع.
      -- quantity_change هنا سالبة توثّق حجم الخسارة فعليًا (لأغراض تقرير
      -- الخسائر)، رغم أنها لا تُطرح من أي رصيد فعلي — البضاعة أصلًا لم
      -- تُضف لـ warehouse_stock عند الإرجاع.
      insert into public.stock_movements (
        movement_type, reference_table, reference_id, product_id,
        location_type, location_id, quantity_change, balance_after, performed_by
      ) values (
        'write_off', 'return_records', v_return_id, v_product_id,
        'warehouse', null, -v_quantity, coalesce((
          select quantity_available from public.warehouse_stock where product_id = v_product_id
        ), 0), auth.uid()
      );
    end if;
  end loop;

  -- التسوية المالية على حساب العميل: إن وُجدت فاتورة أصلية آجلة، تُخصم
  -- قيمة المرتجع من دينها تلقائيًا عبر نفس منطق التحصيل (إعادة استخدام
  -- record_customer_payment بدل تكرار منطق تحديث حالة الفاتورة).
  if p_invoice_id is not null and v_total_credit > 0 then
    perform public.record_customer_payment(p_customer_id, p_invoice_id, v_total_credit, 'cash');
  end if;

  return v_return_id;
end;
$$;

-- ========== 5) إلغاء فاتورة خلال فترة السماح — إعادة الكمية للمخزون المشترك ==========
create or replace function public.cancel_invoice_within_grace_period(
  p_invoice_id uuid,
  p_reason text
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invoice public.invoices;
  v_settings public.system_settings;
  v_item record;
  v_warehouse_qty numeric;
  v_credit_note_id uuid := gen_random_uuid();
begin
  select * into v_invoice from public.invoices where id = p_invoice_id;
  if v_invoice is null then
    raise exception 'الفاتورة غير موجودة';
  end if;
  if v_invoice.rep_id <> auth.uid() then
    raise exception 'غير مصرح لك بإلغاء فاتورة مندوب آخر';
  end if;
  if v_invoice.status = 'cancelled' then
    raise exception 'الفاتورة ملغاة مسبقًا';
  end if;
  -- منع الإلغاء الكامل لفاتورة سبق تسجيل مرتجع عليها: الإلغاء يعيد كامل
  -- كمية invoice_items للرصيد بدون علم بما أُرجع مسبقًا عبر process_return،
  -- ما يسبب ازدواج إضافة نفس الكمية للمخزون (Double-counting).
  if exists (select 1 from public.return_records where invoice_id = p_invoice_id) then
    raise exception 'لا يمكن إلغاء فاتورة سبق تسجيل مرتجع عليها — التصحيح يتم عبر طلب تعديل للأدمن';
  end if;

  select * into v_settings from public.system_settings where id = 1;
  if now() > v_invoice.invoice_date + make_interval(mins => v_settings.invoice_edit_grace_period_minutes) then
    raise exception 'انتهت فترة السماح — يلزم إرسال طلب موافقة للأدمن';
  end if;

  -- إعادة الكمية للمخزون المشترك + حركة مخزون return_in لكل بند
  for v_item in
    select product_id, quantity_in_base_unit from public.invoice_items where invoice_id = p_invoice_id
  loop
    update public.warehouse_stock
    set quantity_available = quantity_available + v_item.quantity_in_base_unit
    where product_id = v_item.product_id
    returning quantity_available into v_warehouse_qty;

    insert into public.stock_movements (
      movement_type, reference_table, reference_id, product_id,
      location_type, location_id, quantity_change, balance_after, performed_by
    ) values (
      'return_in', 'invoices', p_invoice_id, v_item.product_id,
      'warehouse', null, v_item.quantity_in_base_unit, v_warehouse_qty, auth.uid()
    );
  end loop;

  insert into public.credit_notes (id, invoice_id, amount, reason, created_by)
  values (v_credit_note_id, p_invoice_id, v_invoice.total_amount, p_reason, auth.uid());

  update public.invoices set status = 'cancelled' where id = p_invoice_id;

  return v_credit_note_id;
end;
$$;

-- ========== 6) موافقة الأدمن على إلغاء فاتورة بعد فترة السماح — نفس التحويل ==========
create or replace function public.review_invoice_edit_request(
  p_request_id uuid,
  p_decision public.edit_request_status,
  p_admin_notes text default null
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_request public.invoice_edit_requests;
  v_invoice public.invoices;
  v_item record;
  v_warehouse_qty numeric;
  v_credit_note_id uuid;
begin
  if not public.auth_is_admin() then
    raise exception 'فقط الأدمن يقدر يراجع طلبات تعديل الفواتير';
  end if;
  if p_decision not in ('approved', 'rejected') then
    raise exception 'قرار غير صالح';
  end if;

  select * into v_request from public.invoice_edit_requests where id = p_request_id;
  if v_request is null then
    raise exception 'الطلب غير موجود';
  end if;
  if v_request.status <> 'pending' then
    raise exception 'الطلب تمت مراجعته مسبقًا';
  end if;

  update public.invoice_edit_requests
  set status = p_decision, reviewed_by = auth.uid(), reviewed_at = now()
  where id = p_request_id;

  if p_decision = 'approved' and (v_request.requested_changes ->> 'action') = 'cancel' then
    select * into v_invoice from public.invoices where id = v_request.invoice_id;

    if v_invoice.status = 'cancelled' then
      raise exception 'الفاتورة ملغاة مسبقًا';
    end if;
    -- نفس منع الازدواج بـ cancel_invoice_within_grace_period أعلاه
    if exists (select 1 from public.return_records where invoice_id = v_invoice.id) then
      raise exception 'لا يمكن إلغاء فاتورة سبق تسجيل مرتجع عليها';
    end if;

    for v_item in
      select product_id, quantity_in_base_unit
      from public.invoice_items where invoice_id = v_request.invoice_id
    loop
      update public.warehouse_stock
      set quantity_available = quantity_available + v_item.quantity_in_base_unit
      where product_id = v_item.product_id
      returning quantity_available into v_warehouse_qty;

      insert into public.stock_movements (
        movement_type, reference_table, reference_id, product_id,
        location_type, location_id, quantity_change, balance_after, performed_by
      ) values (
        'return_in', 'invoices', v_invoice.id, v_item.product_id,
        'warehouse', null, v_item.quantity_in_base_unit, v_warehouse_qty, auth.uid()
      );
    end loop;

    v_credit_note_id := gen_random_uuid();
    insert into public.credit_notes (id, invoice_id, amount, reason, created_by)
    values (
      v_credit_note_id, v_invoice.id, v_invoice.total_amount,
      coalesce(p_admin_notes, v_request.reason), auth.uid()
    );

    update public.invoices set status = 'cancelled' where id = v_invoice.id;
  end if;
end;
$$;

-- ========== 7) إسقاط دالة نقل البضاعة للمناديب — لم تعد مستخدمة ==========
drop function if exists public.transfer_stock_to_rep(uuid, jsonb);
