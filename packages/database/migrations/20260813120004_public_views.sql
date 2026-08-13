-- Views عامة (anon) — راجع CLAUDE.md §4.2.1: أي بيانات تُعرض للعامة بدون Auth
-- يجب أن تمر عبر VIEW يحدد الأعمدة المسموحة صراحة، لا SELECT مباشر على الجدول.
--
-- ملاحظة تقنية: الـ View هنا تُنفَّذ بصلاحيات مالك الـ View (postgres)، وليس
-- بصلاحيات القارئ (anon) — هذا سلوك Postgres الافتراضي للـ Views (security_invoker
-- = false)، وهو ما يسمح لـ anon بقراءة الـ View رغم أن RLS يمنعه من قراءة
-- customers/products مباشرة. الحماية الفعلية هنا هي تعريف الـ View نفسه:
-- أعمدة محددة فقط + شرط WHERE صريح.

-- ========== نقاط البيع (Store Locator) — راجع requirements.md §3.1 ==========
create view public.public_store_locations
with (security_invoker = false) as
select id, shop_name, google_maps_link
from public.customers
where show_in_store = true;

grant select on public.public_store_locations to anon, authenticated;

-- ========== منتجات المتجر العام — راجع requirements.md §3 ==========
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
where p.visible_in_store = true;

grant select on public.public_products to anon, authenticated;

-- ========== فئات تحتوي منتجات ظاهرة بالمتجر فقط (للفلترة بالمتجر) ==========
create view public.public_categories
with (security_invoker = false) as
select distinct c.id, c.name
from public.categories c
join public.products p on p.category_id = c.id
where p.visible_in_store = true;

grant select on public.public_categories to anon, authenticated;
