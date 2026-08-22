-- ========== تخصيص ثيم المتجر (CSS/HTML مخصص) ==========
-- يسمح للأدمن بتجاوز الثيم الافتراضي بالمتجر (المعرّف بـ apps/store/app/globals.css)
-- عبر CSS مخصص يُحقن كـ <style> بالـ <head>، وHTML مخصص يُعرض بقسم مستقل
-- بالصفحة الرئيسية — بدون المساس بالثيم الافتراضي نفسه بالكود.
alter table public.store_settings
  add column if not exists custom_css text,
  add column if not exists custom_html text;

-- إعادة إنشاء View العامة لتشمل الحقلين الجديدين
drop view if exists public.public_store_settings;
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
  show_points_of_sale_section,
  custom_css,
  custom_html
from public.store_settings
where id = 1;

grant select on public.public_store_settings to anon, authenticated;
