-- إضافة اسم المدينة لعرض نقاط البيع العامة بالمتجر، لدعم فلتر
-- "الكل / حسب المدينة" بصفحة نقاط البيع بالمتجر.
-- راجع CLAUDE.md §4.2.1: أي بيانات تُعرض للعامة (anon) يجب أن تمر عبر
-- View يحدد الأعمدة المسموحة صراحة — لا SELECT مباشر على customers أو
-- customer_branches.
drop view if exists public.public_store_locations;

create view public.public_store_locations
with (security_invoker = false) as
select c.id, c.shop_name, c.google_maps_link, ci.name as city_name
from public.customers c
left join public.cities ci on ci.id = c.city_id
where c.show_in_store = true
union all
select cb.id, coalesce(cb.shop_name, cb.name), cb.google_maps_link, ci.name as city_name
from public.customer_branches cb
left join public.cities ci on ci.id = cb.city_id
where cb.show_in_store = true;

grant select on public.public_store_locations to anon, authenticated;
