-- ========== صور الفئات (لواجهة اختيار الفئة بالمتجر) ==========
-- إضافة عمود صورة اختياري للفئة + bucket تخزين مستقل بنفس نمط صور
-- المنتجات (migration 20260813150000): قراءة عامة، كتابة أدمن فقط عبر RLS.

alter table public.categories add column if not exists image_url text;

insert into storage.buckets (id, name, public)
values ('category-images', 'category-images', true)
on conflict (id) do nothing;

drop policy if exists "category_images_public_read" on storage.objects;
create policy "category_images_public_read"
on storage.objects for select
using (bucket_id = 'category-images');

drop policy if exists "category_images_admin_insert" on storage.objects;
create policy "category_images_admin_insert"
on storage.objects for insert
to authenticated
with check (bucket_id = 'category-images' and public.auth_is_admin());

drop policy if exists "category_images_admin_update" on storage.objects;
create policy "category_images_admin_update"
on storage.objects for update
to authenticated
using (bucket_id = 'category-images' and public.auth_is_admin());

drop policy if exists "category_images_admin_delete" on storage.objects;
create policy "category_images_admin_delete"
on storage.objects for delete
to authenticated
using (bucket_id = 'category-images' and public.auth_is_admin());

-- إعادة إنشاء view الفئات العامة لتضمين الصورة (نفس شرط الفلترة الأصلي)
drop view if exists public.public_categories;
create view public.public_categories
with (security_invoker = false) as
select distinct c.id, c.name, c.image_url
from public.categories c
join public.products p on p.category_id = c.id
where p.visible_in_store = true;

grant select on public.public_categories to anon, authenticated;
