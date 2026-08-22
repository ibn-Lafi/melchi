-- قاعدة بيانات لوحة التحكم المركزية (control-plane) — مشروع Supabase منفصل
-- تمامًا عن أي مشروع عميل، يخزّن فقط بيانات تزويد العملاء والفوترة، وليس
-- أي بيانات تشغيلية لأي عميل. لا تُطبَّق هذه الملفات أبدًا على مشروع عميل.
create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
