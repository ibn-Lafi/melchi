-- ========== أقسام جاهزة اختيارية بالصفحة الرئيسية للمتجر ==========
-- مجموعة أقسام محدَّدة سلفًا (وليست قابلة للإنشاء الحر) يفعّلها الأدمن
-- ويرتّبها ويملأ محتواها — بديل بصري منظّم عن كتابة HTML يدويًا.
create table public.store_sections (
  id uuid primary key default gen_random_uuid(),
  section_type text not null unique check (section_type in ('promo_banner', 'features', 'testimonials')),
  enabled boolean not null default false,
  display_order integer not null default 0,
  content jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_updated_at before update on public.store_sections
  for each row execute function public.set_updated_at();

alter table public.store_sections enable row level security;

create policy "store_sections_select_authenticated"
on public.store_sections for select
to authenticated
using (true);

create policy "store_sections_update_admin"
on public.store_sections for update
using (public.auth_is_admin())
with check (public.auth_is_admin());
-- لا INSERT/DELETE: الأقسام الثلاثة ثابتة، تُدرج مرة واحدة عبر seed أدناه.

insert into public.store_sections (section_type, display_order) values
  ('promo_banner', 1),
  ('features', 2),
  ('testimonials', 3)
on conflict (section_type) do nothing;

-- ========== View عامة (anon) — تعرض فقط الأقسام المفعّلة، مرتّبة ==========
create view public.public_store_sections
with (security_invoker = false) as
select section_type, display_order, content
from public.store_sections
where enabled = true
order by display_order;

grant select on public.public_store_sections to anon, authenticated;
