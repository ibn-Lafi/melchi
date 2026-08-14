-- ========== صور المنتجات (Supabase Storage) + تعديل كمية المخزون يدويًا ==========
-- 1) Bucket عام لصور المنتجات (قراءة عامة، كتابة أدمن فقط عبر RLS على
--    storage.objects). 2) عمود notes لسجل حركات المخزون (سبب التعديل
--    اليدوي). 3) دالة RPC لضبط كمية منتج بالمخزون المشترك مباشرة —
--    راجع CLAUDE.md §4.3.1: "ممنوع تمامًا أي تعديل مباشر على
--    warehouse_stock.quantity_available... كل تغيير كمية يجب أن يمر عبر
--    دالة RPC تكتب أيضًا سجل stock_movements بنفس الوقت".

-- ========== 1) Storage bucket لصور المنتجات ==========
insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do nothing;

drop policy if exists "product_images_public_read" on storage.objects;
create policy "product_images_public_read"
on storage.objects for select
using (bucket_id = 'product-images');

drop policy if exists "product_images_admin_insert" on storage.objects;
create policy "product_images_admin_insert"
on storage.objects for insert
to authenticated
with check (bucket_id = 'product-images' and public.auth_is_admin());

drop policy if exists "product_images_admin_update" on storage.objects;
create policy "product_images_admin_update"
on storage.objects for update
to authenticated
using (bucket_id = 'product-images' and public.auth_is_admin());

drop policy if exists "product_images_admin_delete" on storage.objects;
create policy "product_images_admin_delete"
on storage.objects for delete
to authenticated
using (bucket_id = 'product-images' and public.auth_is_admin());

-- ========== 2) سبب التعديل اليدوي بسجل حركات المخزون ==========
alter table public.stock_movements add column if not exists notes text;

-- ========== 3) ضبط كمية منتج بالمخزون المشترك يدويًا (جرد/تصحيح) ==========
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
  if not public.auth_is_admin() then
    raise exception 'فقط الأدمن يقدر يعدّل كمية المخزون يدويًا';
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
