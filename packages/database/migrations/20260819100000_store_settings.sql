-- ========== إعدادات المتجر الإلكتروني (صف واحد فقط، بنفس نمط system_settings) ==========
-- يسمح للأدمن بالتحكم بهوية ونصوص وروابط تواصل ومقاطع الصفحة الرئيسية
-- بتطبيق apps/store، بدل تثبيتها بالكود.
create table public.store_settings (
  id smallint primary key default 1,
  store_name text not null default 'ميلتشي',
  logo_url text,
  hero_kicker text not null default 'MELCHI',
  hero_title text not null default 'كل ما يحتاجه محلك، بضغطة',
  site_description text not null default 'تصفّح منتجاتنا وتسوّق مباشرة',
  whatsapp_number text,
  instagram_url text,
  tiktok_url text,
  show_points_of_sale_section boolean not null default true,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles (id),
  constraint store_settings_single_row check (id = 1)
);

create trigger set_updated_at before update on public.store_settings
  for each row execute function public.set_updated_at();

alter table public.store_settings enable row level security;

-- القراءة لأي مستخدم مسجّل بلوحة التحكم (نفس نمط system_settings) — ليست
-- بيانات حساسة، فقط لعرضها بصفحة الإعدادات.
create policy "store_settings_select_authenticated"
on public.store_settings for select
to authenticated
using (true);

create policy "store_settings_update_admin"
on public.store_settings for update
using (public.auth_is_admin())
with check (public.auth_is_admin());
-- لا Policy لـ INSERT/DELETE: صف وحيد يُدرج مرة واحدة عبر seed أدناه.

insert into public.store_settings (id)
values (1)
on conflict (id) do nothing;

-- ========== View عامة (anon) — نفس نمط public_products/public_categories ==========
-- تكشف فقط الحقول اللازمة لعرض المتجر، دون id/updated_at/updated_by الداخلية.
create view public.public_store_settings
with (security_invoker = false) as
select
  store_name,
  logo_url,
  hero_kicker,
  hero_title,
  site_description,
  whatsapp_number,
  instagram_url,
  tiktok_url,
  show_points_of_sale_section
from public.store_settings
where id = 1;

grant select on public.public_store_settings to anon, authenticated;

-- ========== bucket تخزين لأصول المتجر (الشعار) — نفس نمط product-images/category-images ==========
insert into storage.buckets (id, name, public)
values ('store-assets', 'store-assets', true)
on conflict (id) do nothing;

drop policy if exists "store_assets_public_read" on storage.objects;
create policy "store_assets_public_read"
on storage.objects for select
using (bucket_id = 'store-assets');

drop policy if exists "store_assets_admin_insert" on storage.objects;
create policy "store_assets_admin_insert"
on storage.objects for insert
to authenticated
with check (bucket_id = 'store-assets' and public.auth_is_admin());

drop policy if exists "store_assets_admin_update" on storage.objects;
create policy "store_assets_admin_update"
on storage.objects for update
to authenticated
using (bucket_id = 'store-assets' and public.auth_is_admin());

drop policy if exists "store_assets_admin_delete" on storage.objects;
create policy "store_assets_admin_delete"
on storage.objects for delete
to authenticated
using (bucket_id = 'store-assets' and public.auth_is_admin());
