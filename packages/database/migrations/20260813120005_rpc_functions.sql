-- Postgres RPC Functions للعمليات الحرجة — راجع CLAUDE.md §4.3 و§4.3.1
-- كل دالة هنا SECURITY DEFINER: تُنفَّذ بصلاحية مالك الجدول (postgres) فتتجاوز
-- RLS، وهذا مقصود ومطلوب — الأمان هنا يتحقق داخل الدالة نفسها (auth.uid()،
-- auth_role()) بدل الاعتماد على RLS للعمليات متعددة الجداول.

-- ========== توليد QR الفاتورة (تنسيق TLV/Base64 المعتمد بفاتورة) ==========
create or replace function public.zatca_tlv_field(p_tag int, p_value text)
returns bytea
language plpgsql
immutable
as $$
declare
  v_bytes bytea := convert_to(coalesce(p_value, ''), 'UTF8');
begin
  if length(v_bytes) > 255 then
    raise exception 'قيمة حقل QR تتجاوز الحد الأقصى المسموح (255 بايت)';
  end if;
  return set_byte(set_byte('\x0000'::bytea, 0, p_tag), 1, length(v_bytes)) || v_bytes;
end;
$$;

create or replace function public.generate_zatca_qr(
  p_seller_name text,
  p_vat_number text,
  p_invoice_timestamp timestamptz,
  p_total_amount numeric,
  p_vat_amount numeric
) returns text
language plpgsql
immutable
as $$
declare
  v_tlv bytea;
begin
  v_tlv :=
    public.zatca_tlv_field(1, p_seller_name)
    || public.zatca_tlv_field(2, p_vat_number)
    || public.zatca_tlv_field(3, to_char(p_invoice_timestamp at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'))
    || public.zatca_tlv_field(4, to_char(p_total_amount, 'FM999999999990.00'))
    || public.zatca_tlv_field(5, to_char(p_vat_amount, 'FM999999999990.00'));
  return encode(v_tlv, 'base64');
end;
$$;

-- ========== إصدار فاتورة بيع + خصم مخزون المندوب (Transaction واحدة) ==========
-- راجع CLAUDE.md §4.3 و§4.3.1 (صف "إصدار فاتورة") و requirements.md §7.3
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

  -- 1. تحقق أن كل الكميات المطلوبة متوفرة برصيد المندوب (بالوحدة الأساسية)
  --    قبل أي تعديل فعلي — راجع النمط الإلزامي بـ CLAUDE.md §4.3
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
    from public.rep_inventory
    where rep_id = p_rep_id and product_id = v_product_id
    for update;

    if v_available is null or v_available < v_quantity_in_base then
      raise exception 'الكمية غير متوفرة في مخزون المندوب لمنتج %', v_product_id;
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

  -- 3. بنود الفاتورة + خصم رصيد المندوب + حركة مخزون sale_out (كلها بنفس الـ transaction)
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

    update public.rep_inventory
    set quantity_available = quantity_available - v_quantity_in_base
    where rep_id = p_rep_id and product_id = v_product_id
    returning quantity_available into v_available;

    insert into public.stock_movements (
      movement_type, reference_table, reference_id, product_id,
      location_type, location_id, quantity_change, balance_after, performed_by
    ) values (
      'sale_out', 'invoices', v_invoice_id, v_product_id,
      'rep', p_rep_id, -v_quantity_in_base, v_available, auth.uid()
    );
  end loop;

  return v_invoice_id;
end;
$$;

-- ========== اعتماد فاتورة شراء + احتساب المتوسط المرجّح (Transaction واحدة) ==========
-- راجع CLAUDE.md §4.3.1 و requirements.md §5.3/§5.4
create or replace function public.create_purchase_invoice(
  p_supplier_id uuid,
  p_items jsonb, -- [{product_id, unit_id, quantity_in_unit, unit_cost}, ...]
  p_payment_status public.purchase_payment_status default 'unpaid'
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
  v_unit_cost numeric;
  v_conversion_factor numeric;
  v_quantity_in_base numeric;
  v_cost_per_base_unit numeric;
  v_old_qty numeric;
  v_old_avg numeric;
  v_new_qty numeric;
  v_new_avg numeric;
  v_subtotal numeric := 0;
  v_purchase_invoice_id uuid := gen_random_uuid();
begin
  if not public.auth_is_admin() then
    raise exception 'فقط الأدمن يقدر يسجّل فاتورة شراء';
  end if;

  if p_items is null or jsonb_array_length(p_items) = 0 then
    raise exception 'يجب إضافة بند واحد على الأقل لفاتورة الشراء';
  end if;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_subtotal := v_subtotal
      + ((v_item ->> 'quantity_in_unit')::numeric * (v_item ->> 'unit_cost')::numeric);
  end loop;

  insert into public.purchase_invoices (
    id, supplier_id, subtotal, total_amount, payment_status, created_by
  ) values (
    v_purchase_invoice_id, p_supplier_id, v_subtotal, v_subtotal, p_payment_status, auth.uid()
  );

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_product_id := (v_item ->> 'product_id')::uuid;
    v_unit_id := (v_item ->> 'unit_id')::uuid;
    v_quantity_in_unit := (v_item ->> 'quantity_in_unit')::numeric;
    v_unit_cost := (v_item ->> 'unit_cost')::numeric;

    if v_quantity_in_unit is null or v_quantity_in_unit <= 0 then
      raise exception 'الكمية يجب أن تكون أكبر من صفر';
    end if;

    select conversion_factor_to_base into v_conversion_factor
    from public.product_units
    where product_id = v_product_id and unit_id = v_unit_id;
    if v_conversion_factor is null then
      select 1 into v_conversion_factor
      from public.products where id = v_product_id and base_unit_id = v_unit_id;
    end if;
    if v_conversion_factor is null then
      raise exception 'الوحدة المختارة غير مرتبطة بهذا المنتج';
    end if;

    v_quantity_in_base := v_quantity_in_unit * v_conversion_factor;
    v_cost_per_base_unit := v_unit_cost / v_conversion_factor;

    insert into public.purchase_invoice_items (
      purchase_invoice_id, product_id, unit_id, quantity_in_unit, quantity_in_base_unit,
      unit_cost, subtotal
    ) values (
      v_purchase_invoice_id, v_product_id, v_unit_id, v_quantity_in_unit, v_quantity_in_base,
      v_unit_cost, v_quantity_in_unit * v_unit_cost
    );

    -- المتوسط المرجّح — راجع requirements.md §5.4
    select quantity_available into v_old_qty
    from public.warehouse_stock where product_id = v_product_id for update;

    if v_old_qty is null then
      v_old_qty := 0;
      insert into public.warehouse_stock (product_id, quantity_available)
      values (v_product_id, 0);
    end if;

    select coalesce(average_cost, 0) into v_old_avg
    from public.products where id = v_product_id;

    v_new_qty := v_old_qty + v_quantity_in_base;
    v_new_avg := case
      when v_new_qty = 0 then v_old_avg
      else ((v_old_qty * v_old_avg) + (v_quantity_in_base * v_cost_per_base_unit)) / v_new_qty
    end;

    update public.products set average_cost = v_new_avg where id = v_product_id;
    update public.warehouse_stock set quantity_available = v_new_qty where product_id = v_product_id;

    insert into public.stock_movements (
      movement_type, reference_table, reference_id, product_id,
      location_type, location_id, quantity_change, balance_after, performed_by
    ) values (
      'purchase_in', 'purchase_invoices', v_purchase_invoice_id, v_product_id,
      'warehouse', null, v_quantity_in_base, v_new_qty, auth.uid()
    );
  end loop;

  return v_purchase_invoice_id;
end;
$$;

-- ========== نقل بضاعة من المخزن المركزي لمندوب (Transaction واحدة) ==========
-- راجع CLAUDE.md §4.3.1 و requirements.md §6.2
create or replace function public.transfer_stock_to_rep(
  p_rep_id uuid,
  p_items jsonb -- [{product_id, quantity}, ...] بالوحدة الأساسية
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_item jsonb;
  v_product_id uuid;
  v_quantity numeric;
  v_warehouse_qty numeric;
  v_rep_qty numeric;
  v_transfer_id uuid := gen_random_uuid();
begin
  if not public.auth_is_admin() then
    raise exception 'فقط الأدمن يقدر ينفّذ عملية نقل بضاعة';
  end if;

  if p_items is null or jsonb_array_length(p_items) = 0 then
    raise exception 'يجب إضافة منتج واحد على الأقل بعملية النقل';
  end if;

  -- تحقق أولًا من توفر كل الكميات بالمخزن المركزي قبل أي تعديل
  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_product_id := (v_item ->> 'product_id')::uuid;
    v_quantity := (v_item ->> 'quantity')::numeric;

    if v_quantity is null or v_quantity <= 0 then
      raise exception 'الكمية يجب أن تكون أكبر من صفر';
    end if;

    select quantity_available into v_warehouse_qty
    from public.warehouse_stock where product_id = v_product_id for update;

    if v_warehouse_qty is null or v_warehouse_qty < v_quantity then
      raise exception 'الكمية غير متوفرة بالمخزن المركزي لمنتج %', v_product_id;
    end if;
  end loop;

  insert into public.stock_transfers (id, rep_id, created_by)
  values (v_transfer_id, p_rep_id, auth.uid());

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_product_id := (v_item ->> 'product_id')::uuid;
    v_quantity := (v_item ->> 'quantity')::numeric;

    insert into public.stock_transfer_items (transfer_id, product_id, quantity)
    values (v_transfer_id, v_product_id, v_quantity);

    update public.warehouse_stock
    set quantity_available = quantity_available - v_quantity
    where product_id = v_product_id
    returning quantity_available into v_warehouse_qty;

    insert into public.stock_movements (
      movement_type, reference_table, reference_id, product_id,
      location_type, location_id, quantity_change, balance_after, performed_by
    ) values (
      'transfer_out', 'stock_transfers', v_transfer_id, v_product_id,
      'warehouse', null, -v_quantity, v_warehouse_qty, auth.uid()
    );

    insert into public.rep_inventory (rep_id, product_id, quantity_available)
    values (p_rep_id, v_product_id, v_quantity)
    on conflict (rep_id, product_id)
    do update set quantity_available = public.rep_inventory.quantity_available + excluded.quantity_available
    returning quantity_available into v_rep_qty;

    insert into public.stock_movements (
      movement_type, reference_table, reference_id, product_id,
      location_type, location_id, quantity_change, balance_after, performed_by
    ) values (
      'transfer_in', 'stock_transfers', v_transfer_id, v_product_id,
      'rep', p_rep_id, v_quantity, v_rep_qty, auth.uid()
    );
  end loop;

  return v_transfer_id;
end;
$$;

-- ========== تسجيل تحصيل من عميل + تحديث حالة الفاتورة تلقائيًا ==========
-- راجع CLAUDE.md §4.3.1 و requirements.md §11
create or replace function public.record_customer_payment(
  p_customer_id uuid,
  p_invoice_id uuid,
  p_amount numeric,
  p_method public.settlement_method
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_payment_id uuid := gen_random_uuid();
  v_invoice_total numeric;
  v_paid_total numeric;
  v_is_authorized boolean;
begin
  select
    public.auth_is_admin_or_accountant()
    or (
      public.auth_is_rep()
      and exists (
        select 1 from public.customer_reps cr
        where cr.customer_id = p_customer_id and cr.rep_id = auth.uid()
      )
    )
  into v_is_authorized;

  if not v_is_authorized then
    raise exception 'غير مصرح لك بتسجيل تحصيل لهذا العميل';
  end if;

  if p_amount is null or p_amount <= 0 then
    raise exception 'قيمة التحصيل يجب أن تكون أكبر من صفر';
  end if;

  insert into public.payments (id, invoice_id, customer_id, amount, method, recorded_by)
  values (v_payment_id, p_invoice_id, p_customer_id, p_amount, p_method, auth.uid());

  if p_invoice_id is not null then
    select total_amount into v_invoice_total from public.invoices where id = p_invoice_id;
    select coalesce(sum(amount), 0) into v_paid_total
    from public.payments where invoice_id = p_invoice_id;

    update public.invoices
    set status = case
      when v_paid_total >= v_invoice_total then 'paid'::public.invoice_status
      when v_paid_total > 0 then 'partial'::public.invoice_status
      else 'unpaid'::public.invoice_status
    end
    where id = p_invoice_id and status <> 'cancelled';
  end if;

  return v_payment_id;
end;
$$;

-- ========== تسجيل دفعة لمورد + تحديث حالة فاتورة الشراء تلقائيًا ==========
-- راجع CLAUDE.md §4.3.1 و requirements.md §5.5
create or replace function public.record_supplier_payment(
  p_supplier_id uuid,
  p_purchase_invoice_id uuid,
  p_amount numeric,
  p_method public.settlement_method
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_payment_id uuid := gen_random_uuid();
  v_invoice_total numeric;
  v_paid_total numeric;
begin
  if not public.auth_is_admin() then
    raise exception 'فقط الأدمن يقدر يسجّل دفعة لمورد';
  end if;

  if p_amount is null or p_amount <= 0 then
    raise exception 'قيمة الدفعة يجب أن تكون أكبر من صفر';
  end if;

  insert into public.supplier_payments (
    id, purchase_invoice_id, supplier_id, amount, method, recorded_by
  ) values (
    v_payment_id, p_purchase_invoice_id, p_supplier_id, p_amount, p_method, auth.uid()
  );

  if p_purchase_invoice_id is not null then
    select total_amount into v_invoice_total
    from public.purchase_invoices where id = p_purchase_invoice_id;
    select coalesce(sum(amount), 0) into v_paid_total
    from public.supplier_payments where purchase_invoice_id = p_purchase_invoice_id;

    update public.purchase_invoices
    set payment_status = case
      when v_paid_total >= v_invoice_total then 'paid'::public.purchase_payment_status
      when v_paid_total > 0 then 'partial'::public.purchase_payment_status
      else 'unpaid'::public.purchase_payment_status
    end
    where id = p_purchase_invoice_id;
  end if;

  return v_payment_id;
end;
$$;

-- ========== تسجيل مرتجع + تسوية مالية + تحديث المخزون حسب الحالة ==========
-- راجع CLAUDE.md §4.3.1 و requirements.md §10.2/§10.3
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
  v_rep_qty numeric;
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
      if p_rep_id is null then
        raise exception 'لا يمكن إرجاع بضاعة سليمة لرصيد مندوب بدون تحديد المندوب';
      end if;

      insert into public.rep_inventory (rep_id, product_id, quantity_available)
      values (p_rep_id, v_product_id, v_quantity)
      on conflict (rep_id, product_id)
      do update set quantity_available = public.rep_inventory.quantity_available + excluded.quantity_available
      returning quantity_available into v_rep_qty;

      insert into public.stock_movements (
        movement_type, reference_table, reference_id, product_id,
        location_type, location_id, quantity_change, balance_after, performed_by
      ) values (
        'return_in', 'return_records', v_return_id, v_product_id,
        'rep', p_rep_id, v_quantity, v_rep_qty, auth.uid()
      );
    else
      -- تالف/منتهي الصلاحية: خسارة موثّقة بدون أي إضافة لمخزون قابل للبيع
      insert into public.stock_movements (
        movement_type, reference_table, reference_id, product_id,
        location_type, location_id, quantity_change, balance_after, performed_by
      ) values (
        'write_off', 'return_records', v_return_id, v_product_id,
        'rep', p_rep_id, 0, coalesce((
          select quantity_available from public.rep_inventory
          where rep_id = p_rep_id and product_id = v_product_id
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

-- ========== إلغاء فاتورة خلال فترة السماح (المندوب بحرية) ==========
-- راجع requirements.md §7.7: فترة سماح (افتراضيًا 30 دقيقة من system_settings)
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
  v_rep_qty numeric;
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

  select * into v_settings from public.system_settings where id = 1;
  if now() > v_invoice.invoice_date + make_interval(mins => v_settings.invoice_edit_grace_period_minutes) then
    raise exception 'انتهت فترة السماح — يلزم إرسال طلب موافقة للأدمن';
  end if;

  -- إعادة الكمية لرصيد المندوب + حركة مخزون return_in لكل بند
  for v_item in
    select product_id, quantity_in_base_unit from public.invoice_items where invoice_id = p_invoice_id
  loop
    update public.rep_inventory
    set quantity_available = quantity_available + v_item.quantity_in_base_unit
    where rep_id = v_invoice.rep_id and product_id = v_item.product_id
    returning quantity_available into v_rep_qty;

    insert into public.stock_movements (
      movement_type, reference_table, reference_id, product_id,
      location_type, location_id, quantity_change, balance_after, performed_by
    ) values (
      'return_in', 'invoices', p_invoice_id, v_item.product_id,
      'rep', v_invoice.rep_id, v_item.quantity_in_base_unit, v_rep_qty, auth.uid()
    );
  end loop;

  insert into public.credit_notes (id, invoice_id, amount, reason, created_by)
  values (v_credit_note_id, p_invoice_id, v_invoice.total_amount, p_reason, auth.uid());

  update public.invoices set status = 'cancelled' where id = p_invoice_id;

  return v_credit_note_id;
end;
$$;

-- ========== طلب تعديل/إلغاء فاتورة بعد فترة السماح (يحتاج موافقة أدمن) ==========
create or replace function public.request_invoice_edit(
  p_invoice_id uuid,
  p_reason text,
  p_requested_changes jsonb
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_request_id uuid := gen_random_uuid();
  v_rep_id uuid;
begin
  select rep_id into v_rep_id from public.invoices where id = p_invoice_id;
  if v_rep_id is null then
    raise exception 'الفاتورة غير موجودة';
  end if;
  if v_rep_id <> auth.uid() then
    raise exception 'غير مصرح لك بطلب تعديل فاتورة مندوب آخر';
  end if;

  insert into public.invoice_edit_requests (id, invoice_id, requested_by, reason, requested_changes)
  values (v_request_id, p_invoice_id, auth.uid(), p_reason, p_requested_changes);

  return v_request_id;
end;
$$;

-- مراجعة طلب التعديل من الأدمن. عند الموافقة على "إلغاء كامل" (requested_changes
-- تحتوي {"action": "cancel"}) يُنشأ إشعار دائن كامل ويُعاد المخزون تلقائيًا،
-- بنفس منطق الإلغاء بفترة السماح. تعديل جزئي (تغيير بنود دون إلغاء كامل)
-- يحتاج تصميم إضافي لاحقًا حسب نوع التعديل تحديدًا — غير مُنفَّذ تلقائيًا هنا
-- عمدًا، ويُترك للأدمن استكماله يدويًا عبر إشعار دائن/مدين منفصل حاليًا.
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
  v_rep_qty numeric;
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

    for v_item in
      select product_id, quantity_in_base_unit
      from public.invoice_items where invoice_id = v_request.invoice_id
    loop
      update public.rep_inventory
      set quantity_available = quantity_available + v_item.quantity_in_base_unit
      where rep_id = v_invoice.rep_id and product_id = v_item.product_id
      returning quantity_available into v_rep_qty;

      insert into public.stock_movements (
        movement_type, reference_table, reference_id, product_id,
        location_type, location_id, quantity_change, balance_after, performed_by
      ) values (
        'return_in', 'invoices', v_invoice.id, v_item.product_id,
        'rep', v_invoice.rep_id, v_item.quantity_in_base_unit, v_rep_qty, auth.uid()
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
