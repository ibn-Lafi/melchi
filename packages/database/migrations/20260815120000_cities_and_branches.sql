-- ========== المدن (تصنيف لمدينة العميل/الفرع، بنفس نمط الفئات) ==========
create table public.cities (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_updated_at before update on public.cities
  for each row execute function public.set_updated_at();

alter table public.cities enable row level security;

create policy "cities_select_staff"
on public.cities for select
using (public.auth_is_staff());

create policy "cities_manage_admin"
on public.cities for all
using (public.auth_has_permission('manage_customers'))
with check (public.auth_has_permission('manage_customers'));

alter table public.customers
  add column city_id uuid references public.cities (id) on delete set null;

-- ========== فروع العميل (بعض العملاء لديهم أكثر من موقع بيع فعلي) ==========
-- كل فرع نقطة بيع مستقلة تمامًا بصفحة نقاط البيع بالمتجر (راجع تعديل
-- public_store_locations أدناه) — وليس مجرد تفصيل إضافي يُدمج بالعميل
-- الأصلي. عند إصدار فاتورة لعميل له فروع، يختار المندوب الفرع المقصود.
create table public.customer_branches (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers (id) on delete cascade,
  name text not null,
  shop_name text,
  address text,
  city_id uuid references public.cities (id) on delete set null,
  phone text,
  google_maps_link text,
  show_in_store boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index customer_branches_customer_id_idx on public.customer_branches (customer_id);

create trigger set_updated_at before update on public.customer_branches
  for each row execute function public.set_updated_at();

alter table public.customer_branches enable row level security;

create policy "customer_branches_select_admin_or_accountant"
on public.customer_branches for select
using (public.auth_is_staff());

create policy "customer_branches_select_own_rep"
on public.customer_branches for select
using (
  exists (
    select 1 from public.customer_reps cr
    where cr.customer_id = customer_branches.customer_id and cr.rep_id = auth.uid()
  )
);

create policy "customer_branches_manage_admin"
on public.customer_branches for all
using (public.auth_has_permission('manage_customers'))
with check (public.auth_has_permission('manage_customers'));

-- ========== ربط الفاتورة بالفرع (اختياري — فقط عند وجود فروع للعميل) ==========
alter table public.invoices
  add column branch_id uuid references public.customer_branches (id) on delete set null;

-- ========== نقاط البيع العامة بالمتجر: تضم فروع العملاء كنقاط مستقلة ==========
-- كل فرع ظاهر (show_in_store) يظهر كنقطة بيع منفردة بذاته، بدون أي دمج مع
-- العميل الأصلي أو باقي فروعه — راجع CLAUDE.md §4.2.1 (View يحدد الأعمدة
-- المسموحة صراحة، لا SELECT مباشر على الجداول الأساسية).
drop view if exists public.public_store_locations;
create view public.public_store_locations
with (security_invoker = false) as
select id, shop_name, google_maps_link
from public.customers
where show_in_store = true
union all
select id, coalesce(shop_name, name), google_maps_link
from public.customer_branches
where show_in_store = true;

grant select on public.public_store_locations to anon, authenticated;

-- ========== إصدار فاتورة بيع: قبول فرع اختياري p_branch_id ==========
drop function if exists public.create_invoice_with_stock_check(
  uuid, uuid, jsonb, public.invoice_payment_method, numeric
);

create or replace function public.create_invoice_with_stock_check(
  p_rep_id uuid,
  p_customer_id uuid,
  p_items jsonb, -- [{product_id, unit_id, quantity_in_unit}, ...]
  p_payment_method public.invoice_payment_method,
  p_discount_percentage numeric default 0,
  p_branch_id uuid default null
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

  if p_branch_id is not null and not exists (
    select 1 from public.customer_branches
    where id = p_branch_id and customer_id = p_customer_id
  ) then
    raise exception 'الفرع المحدد لا يتبع هذا العميل';
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
    discount_percentage, branch_id
  ) values (
    v_invoice_id, v_invoice_number, p_rep_id, p_customer_id, v_now,
    v_subtotal, v_vat_amount, v_total_amount, v_qr, p_payment_method,
    case when p_payment_method = 'credit' then 'unpaid'::public.invoice_status else 'paid'::public.invoice_status end,
    p_discount_percentage, p_branch_id
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
