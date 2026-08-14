-- Triggers: updated_at التلقائي، إنشاء profile عند تسجيل مستخدم جديد،
-- مزامنة الدور إلى app_metadata بالـ JWT، وسجل التدقيق (audit_logs)

-- ========== updated_at التلقائي ==========
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.categories
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.units
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.products
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.product_units
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.suppliers
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.purchase_invoices
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.purchase_invoice_items
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.supplier_payments
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.warehouse_stock
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.stock_transfers
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.stock_transfer_items
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.customers
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.rep_inventory
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.invoices
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.invoice_items
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.invoice_edit_requests
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.credit_notes
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.payments
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.return_records
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.return_items
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.system_settings
  for each row execute function public.set_updated_at();

-- ========== إنشاء profile تلقائيًا عند تسجيل مستخدم جديد بـ Supabase Auth ==========
-- يُنشئ الأدمن المستخدمين عبر Edge Function بصلاحية service_role تمرر name/role
-- ضمن raw_user_meta_data وقت الإنشاء، وهذا الـ trigger يقرأها وينشئ صف profiles.
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

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ========== مزامنة profiles.role إلى app_metadata بالـ JWT ==========
-- auth_role() (الملف السابق) يقرأ الدور من app_metadata، فيلزم تحديثه كل ما
-- تغيّر عمود role بجدول profiles حتى تعكس الـ policies الدور الصحيح فورًا.
create or replace function public.sync_role_to_app_metadata()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update auth.users
  set raw_app_meta_data = raw_app_meta_data || jsonb_build_object('role', new.role::text)
  where id = new.id;
  return new;
end;
$$;

create trigger sync_role_to_app_metadata
  after insert or update of role on public.profiles
  for each row execute function public.sync_role_to_app_metadata();

-- ========== سجل التدقيق (audit_logs) — راجع CLAUDE.md §5.6 ==========
create or replace function public.audit_log_trigger()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.audit_logs (table_name, record_id, action, performed_by, old_values, new_values)
  values (
    TG_TABLE_NAME,
    coalesce((new).id, (old).id),
    lower(TG_OP)::public.audit_action,
    auth.uid(),
    case when TG_OP = 'INSERT' then null else to_jsonb(old) end,
    case when TG_OP = 'DELETE' then null else to_jsonb(new) end
  );
  return coalesce(new, old);
end;
$$;

-- تُطبَّق فقط على العمليات الحساسة ماليًا/مخزونيًا (راجع CLAUDE.md §5.6)
create trigger audit_invoices
  after insert or update on public.invoices
  for each row execute function public.audit_log_trigger();
create trigger audit_invoice_edit_requests
  after insert or update on public.invoice_edit_requests
  for each row execute function public.audit_log_trigger();
create trigger audit_credit_notes
  after insert on public.credit_notes
  for each row execute function public.audit_log_trigger();
create trigger audit_payments
  after insert on public.payments
  for each row execute function public.audit_log_trigger();
create trigger audit_supplier_payments
  after insert on public.supplier_payments
  for each row execute function public.audit_log_trigger();
create trigger audit_rep_inventory
  after update on public.rep_inventory
  for each row execute function public.audit_log_trigger();
create trigger audit_warehouse_stock
  after update on public.warehouse_stock
  for each row execute function public.audit_log_trigger();
create trigger audit_return_records
  after insert on public.return_records
  for each row execute function public.audit_log_trigger();
create trigger audit_stock_transfers
  after insert on public.stock_transfers
  for each row execute function public.audit_log_trigger();
