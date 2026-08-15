-- ========== أرشفة المنتجات (بدل حذف فعلي) ==========
-- راجع requirements.md §12.1 ("إضافة/تعديل/حذف" للمنتجات) — لا يوجد DELETE
-- فعلي لأن product_id مرجوع بسجلات فواتير تاريخية (invoice_items) وحركات
-- مخزون (stock_movements)، فحذفه يكسر السجل التاريخي. البديل الآمن: عمود
-- is_active يُخفي المنتج من كتالوج المندوب والمتجر العام دون حذف بياناته.

alter table public.products add column if not exists is_active boolean not null default true;

drop view if exists public.public_products;
create view public.public_products
with (security_invoker = false) as
select
  p.id,
  p.name,
  p.description,
  p.price,
  p.image_url,
  p.category_id,
  c.name as category_name,
  u.name as base_unit_name
from public.products p
left join public.categories c on c.id = p.category_id
join public.units u on u.id = p.base_unit_id
where p.visible_in_store = true and p.is_active = true;

grant select on public.public_products to anon, authenticated;
