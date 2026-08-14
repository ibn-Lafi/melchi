-- تحويل تسجيل الدخول من رقم الجوال إلى البريد الإلكتروني (admin وrep).
-- يُطبَّق تلقائيًا ضمن ملف migrations الكامل على مشروع جديد، ويُستخدم أيضًا
-- كـ patch مستقل (ALTER ... IF NOT EXISTS) على مشروع طُبِّق عليه المخطط سابقًا.

alter table public.profiles add column if not exists email text;

-- تعبئة email للمستخدمين الحاليين (إن وُجدوا) من auth.users
update public.profiles p
set email = u.email
from auth.users u
where p.id = u.id and p.email is null;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, name, email, phone, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'name', ''),
    new.email,
    new.raw_user_meta_data ->> 'phone',
    coalesce((new.raw_user_meta_data ->> 'role')::public.user_role, 'rep')
  );
  return new;
end;
$$;
