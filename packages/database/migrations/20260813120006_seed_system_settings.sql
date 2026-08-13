-- صف الإعدادات الوحيد — القيم الفعلية (اسم الشركة، الرقم الضريبي...) تُملأ
-- لاحقًا من لوحة التحكم (system_settings_update_admin policy)، وليس هنا.
insert into public.system_settings (id)
values (1)
on conflict (id) do nothing;
