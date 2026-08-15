-- ========== أدوار موظفين جدد + نظام صلاحيات لكل دور ==========
-- راجع CLAUDE.md §5 (RLS هي خط الدفاع الحقيقي، لا تثق بالفرونت إند).
-- المندوب (rep) غير متأثر إطلاقًا — له تطبيقه ونظام صلاحياته المستقل.
--
-- الصلاحيات مُشتقة من الدور مباشرة (case ثابتة داخل auth_has_permission)،
-- وليست عمودًا منفصلًا — أبسط للتدقيق ولا تحتاج مزامنة JWT إضافية، لأن
-- الدور نفسه مُزامَن أصلًا (sync_role_to_app_metadata، راجع migration
-- 20260813120002). نفس هذه المصفوفة موجودة بجانب الفرونت إند
-- (apps/admin/lib/permissions.ts) للعرض/الإخفاء فقط — RLS هنا هي الملزمة.
-- ملاحظة: auth_has_permission() تُرجع true للأدمن دائمًا (أي صلاحية)، فلا
-- داعي لكتابة "auth_is_admin() or auth_has_permission(...)" بأي مكان.

alter type public.user_role add value if not exists 'marketing';
alter type public.user_role add value if not exists 'sales';
alter type public.user_role add value if not exists 'production';
alter type public.user_role add value if not exists 'supervisor';

-- ========== auth_is_staff(): قراءة عامة لكل موظفي لوحة التحكم ==========
-- rename تحافظ على OID الدالة فتستمر كل RLS Policies المعرَّفة سابقًا
-- بالعمل تلقائيًا بدون أي DROP/CREATE POLICY. القراءة داخل لوحة التحكم
-- عامة لكل الموظفين الداخليين (وليست حسّاسة كالكتابة) — نفس المبدأ
-- المطبَّق أصلًا على دور accountant منذ البداية.
alter function public.auth_is_admin_or_accountant() rename to auth_is_staff;

create or replace function public.auth_is_staff()
returns boolean
language sql
stable
as $$
  select public.auth_role() in ('admin', 'accountant', 'marketing', 'sales', 'production', 'supervisor');
$$;

-- ========== auth_has_permission(): الصلاحية الفعلية لكل دور ==========
-- المفاتيح: manage_products, manage_warehouse, manage_purchases,
-- manage_customers, manage_collections, manage_returns,
-- manage_invoice_requests, manage_reps, manage_settings, view_reports.
-- manage_reps و manage_settings حصرًا للأدمن (إدارة المستخدمين والنظام لا
-- تُفوَّض لأي دور آخر).
create or replace function public.auth_has_permission(p_permission text)
returns boolean
language sql
stable
as $$
  select case public.auth_role()
    when 'admin' then true
    when 'accountant' then p_permission in ('view_reports', 'manage_collections')
    when 'marketing' then p_permission in ('manage_products', 'view_reports')
    when 'sales' then p_permission in ('manage_customers', 'manage_collections', 'manage_returns', 'view_reports')
    when 'production' then p_permission in ('manage_products', 'manage_purchases', 'manage_warehouse', 'view_reports')
    when 'supervisor' then p_permission in ('view_reports', 'manage_invoice_requests', 'manage_returns')
    else false
  end;
$$;

-- ========== تحديث سياسات الكتابة لتقبل الصلاحية المناسبة، وليس الأدمن فقط ==========

drop policy if exists "categories_manage_admin" on public.categories;
create policy "categories_manage_admin"
on public.categories for all
using (public.auth_has_permission('manage_products'))
with check (public.auth_has_permission('manage_products'));

drop policy if exists "units_manage_admin" on public.units;
create policy "units_manage_admin"
on public.units for all
using (public.auth_has_permission('manage_products'))
with check (public.auth_has_permission('manage_products'));

drop policy if exists "products_manage_admin" on public.products;
create policy "products_manage_admin"
on public.products for all
using (public.auth_has_permission('manage_products'))
with check (public.auth_has_permission('manage_products'));

drop policy if exists "product_units_manage_admin" on public.product_units;
create policy "product_units_manage_admin"
on public.product_units for all
using (public.auth_has_permission('manage_products'))
with check (public.auth_has_permission('manage_products'));

drop policy if exists "suppliers_manage_admin" on public.suppliers;
create policy "suppliers_manage_admin"
on public.suppliers for all
using (public.auth_has_permission('manage_purchases'))
with check (public.auth_has_permission('manage_purchases'));

drop policy if exists "customers_manage_admin" on public.customers;
create policy "customers_manage_admin"
on public.customers for all
using (public.auth_has_permission('manage_customers'))
with check (public.auth_has_permission('manage_customers'));

drop policy if exists "customer_reps_manage_admin" on public.customer_reps;
create policy "customer_reps_manage_admin"
on public.customer_reps for all
using (public.auth_has_permission('manage_customers'))
with check (public.auth_has_permission('manage_customers'));

-- طلبات تعديل الفواتير: المشرف يقدر يشوفها ويراجعها (manage_invoice_requests)
-- بجانب الأدمن — المراجعة الفعلية عبر review_invoice_edit_request() أدناه.
drop policy if exists "invoice_edit_requests_select_admin" on public.invoice_edit_requests;
create policy "invoice_edit_requests_select_admin"
on public.invoice_edit_requests for select
using (public.auth_has_permission('manage_invoice_requests'));

-- audit_logs: نفس منطق المراجعة (مشرف يقدر يشوف السجل، الأدمن دائمًا).
drop policy if exists "audit_logs_select_admin" on public.audit_logs;
create policy "audit_logs_select_admin"
on public.audit_logs for select
using (public.auth_has_permission('manage_invoice_requests'));

-- ========== منع تصعيد الصلاحية الذاتي (Self-Privilege Escalation) ==========
-- سياسة "profiles_update_own_limited_or_admin" تسمح بتحديث الصف الخاص
-- (id = auth.uid()) لكن بدون قيد فعلي على الأعمدة رغم اسمها "limited" —
-- بدون هذا الـ trigger، مستخدم عادي يقدر نظريًا يحدّث role/is_active
-- الخاصين به مباشرة (تصعيد صلاحية). صفحة الحساب الشخصي الجديدة تسمح
-- للمستخدم بتعديل اسمه فقط، وهذا الـ trigger يضمن ذلك فعليًا على مستوى
-- قاعدة البيانات، لا الواجهة فقط.
create or replace function public.prevent_self_privilege_escalation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.auth_is_admin() and (new.role <> old.role or new.is_active <> old.is_active) then
    raise exception 'لا يمكنك تعديل دورك أو حالتك بنفسك';
  end if;
  return new;
end;
$$;

drop trigger if exists prevent_self_privilege_escalation on public.profiles;
create trigger prevent_self_privilege_escalation
  before update of role, is_active on public.profiles
  for each row execute function public.prevent_self_privilege_escalation();

-- ========== تحديث الدوال الحرجة (RPC) لتقبل الصلاحية المناسبة ==========
-- كل دالة أدناه منسوخة حرفيًا من نسختها الحالية بالمخطط، مع تعديل سطر
-- التحقق من الصلاحية فقط — لا تغيير بأي منطق مالي أو مخزوني آخر.

create or replace function public.set_warehouse_stock_quantity(
  p_product_id uuid,
  p_new_quantity numeric,
  p_reason text default null
) returns numeric
language plpgsql
security definer
set search_path = public
as $$
declare
  v_old_quantity numeric;
  v_delta numeric;
begin
  if not public.auth_has_permission('manage_warehouse') then
    raise exception 'غير مصرح لك بتعديل كمية المخزون يدويًا';
  end if;

  if p_new_quantity is null or p_new_quantity < 0 then
    raise exception 'الكمية يجب أن تكون صفر أو أكبر';
  end if;

  select quantity_available into v_old_quantity
  from public.warehouse_stock
  where product_id = p_product_id
  for update;

  if v_old_quantity is null then
    v_old_quantity := 0;
    insert into public.warehouse_stock (product_id, quantity_available)
    values (p_product_id, p_new_quantity);
  else
    update public.warehouse_stock
    set quantity_available = p_new_quantity
    where product_id = p_product_id;
  end if;

  v_delta := p_new_quantity - v_old_quantity;

  if v_delta <> 0 then
    if p_reason is null or btrim(p_reason) = '' then
      raise exception 'سبب تعديل الكمية إلزامي';
    end if;

    insert into public.stock_movements (
      movement_type, reference_table, reference_id, product_id,
      location_type, location_id, quantity_change, balance_after, notes, performed_by
    ) values (
      'adjustment', 'warehouse_stock', p_product_id, p_product_id,
      'warehouse', null, v_delta, p_new_quantity, p_reason, auth.uid()
    );
  end if;

  return p_new_quantity;
end;
$$;

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
  if not public.auth_has_permission('manage_purchases') then
    raise exception 'غير مصرح لك بتسجيل فاتورة شراء';
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
  if not public.auth_has_permission('manage_purchases') then
    raise exception 'غير مصرح لك بتسجيل دفعة لمورد';
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
    public.auth_has_permission('manage_collections')
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
  select
    public.auth_has_permission('manage_returns')
    or (public.auth_is_rep() and p_rep_id = auth.uid())
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
  if not public.auth_has_permission('manage_invoice_requests') then
    raise exception 'غير مصرح لك بمراجعة طلبات تعديل الفواتير';
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
    -- نفس منع الازدواج بـ cancel_invoice_within_grace_period
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
