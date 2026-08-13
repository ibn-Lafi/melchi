-- Row Level Security — مفعّل على كل جدول بدون استثناء (راجع CLAUDE.md §4.1)
-- الافتراضي Deny-by-default: أي جدول بدون Policy صريحة = ممنوع الوصول له كليًا.
--
-- ملاحظة مهمة: الجداول التي تتأثر بعمليات حرجة (invoices, invoice_items,
-- warehouse_stock, rep_inventory, stock_movements, credit_notes...) لا تملك
-- عمدًا أي Policy لـ INSERT/UPDATE/DELETE من هنا — الكتابة عليها تتم حصرًا
-- عبر RPC Functions بصلاحية SECURITY DEFINER (تتجاوز RLS كونها مملوكة لمالك
-- الجدول). هذا يفرض قاعدة "لا كتابة مباشرة من الفرونت إند" على مستوى قاعدة
-- البيانات نفسها، وليس فقط كاتفاقية كود.

alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.units enable row level security;
alter table public.products enable row level security;
alter table public.product_units enable row level security;
alter table public.suppliers enable row level security;
alter table public.purchase_invoices enable row level security;
alter table public.purchase_invoice_items enable row level security;
alter table public.supplier_payments enable row level security;
alter table public.warehouse_stock enable row level security;
alter table public.stock_transfers enable row level security;
alter table public.stock_transfer_items enable row level security;
alter table public.stock_movements enable row level security;
alter table public.customers enable row level security;
alter table public.customer_reps enable row level security;
alter table public.rep_inventory enable row level security;
alter table public.invoices enable row level security;
alter table public.invoice_items enable row level security;
alter table public.invoice_edit_requests enable row level security;
alter table public.credit_notes enable row level security;
alter table public.payments enable row level security;
alter table public.return_records enable row level security;
alter table public.return_items enable row level security;
alter table public.system_settings enable row level security;
alter table public.audit_logs enable row level security;

-- ========== profiles ==========
create policy "profiles_select_own_or_admin"
on public.profiles for select
using (id = auth.uid() or public.auth_is_admin_or_accountant());

create policy "profiles_update_own_limited_or_admin"
on public.profiles for update
using (id = auth.uid() or public.auth_is_admin())
with check (id = auth.uid() or public.auth_is_admin());

-- لا Policy لـ INSERT: صف profiles يُنشأ فقط عبر trigger on_auth_user_created.

-- ========== categories / units (بيانات مرجعية) ==========
create policy "categories_select_authenticated"
on public.categories for select
to authenticated
using (true);

create policy "categories_manage_admin"
on public.categories for all
using (public.auth_is_admin())
with check (public.auth_is_admin());

create policy "units_select_authenticated"
on public.units for select
to authenticated
using (true);

create policy "units_manage_admin"
on public.units for all
using (public.auth_is_admin())
with check (public.auth_is_admin());

-- ========== products / product_units ==========
-- ملاحظة: زوار المتجر (anon) لا يصلون لهذا الجدول مباشرة إطلاقًا، بل عبر
-- public_products view فقط (راجع ملف public_views) — هذا يمنع أي تسريب
-- لعمود حساس مثل average_cost حتى لو أُضيف عمود جديد مستقبلًا بالخطأ.
create policy "products_select_authenticated"
on public.products for select
to authenticated
using (true);

create policy "products_manage_admin"
on public.products for all
using (public.auth_is_admin())
with check (public.auth_is_admin());

create policy "product_units_select_authenticated"
on public.product_units for select
to authenticated
using (true);

create policy "product_units_manage_admin"
on public.product_units for all
using (public.auth_is_admin())
with check (public.auth_is_admin());

-- ========== suppliers / purchase_invoices / purchase_invoice_items / supplier_payments ==========
-- قسم المشتريات ومستحقات الموردين: أدمن كامل، محاسب عرض فقط، لا وصول للمندوب.
create policy "suppliers_select_admin_or_accountant"
on public.suppliers for select
using (public.auth_is_admin_or_accountant());

create policy "suppliers_manage_admin"
on public.suppliers for all
using (public.auth_is_admin())
with check (public.auth_is_admin());

create policy "purchase_invoices_select_admin_or_accountant"
on public.purchase_invoices for select
using (public.auth_is_admin_or_accountant());
-- لا Policy لـ INSERT/UPDATE: تتم عبر create_purchase_invoice() فقط.

create policy "purchase_invoice_items_select_admin_or_accountant"
on public.purchase_invoice_items for select
using (public.auth_is_admin_or_accountant());

create policy "supplier_payments_select_admin_or_accountant"
on public.supplier_payments for select
using (public.auth_is_admin_or_accountant());
-- لا Policy لـ INSERT: تتم عبر record_supplier_payment() فقط.

-- ========== warehouse_stock / stock_transfers / stock_transfer_items / stock_movements ==========
create policy "warehouse_stock_select_admin_or_accountant"
on public.warehouse_stock for select
using (public.auth_is_admin_or_accountant());

create policy "stock_transfers_select_admin_or_accountant"
on public.stock_transfers for select
using (public.auth_is_admin_or_accountant());

create policy "stock_transfers_select_own_rep"
on public.stock_transfers for select
using (rep_id = auth.uid());
-- لا Policy لـ INSERT: تتم عبر transfer_stock_to_rep() فقط.

create policy "stock_transfer_items_select_admin_or_accountant"
on public.stock_transfer_items for select
using (public.auth_is_admin_or_accountant());

create policy "stock_transfer_items_select_own_rep"
on public.stock_transfer_items for select
using (
  exists (
    select 1 from public.stock_transfers st
    where st.id = stock_transfer_items.transfer_id and st.rep_id = auth.uid()
  )
);

create policy "stock_movements_select_admin_or_accountant"
on public.stock_movements for select
using (public.auth_is_admin_or_accountant());

create policy "stock_movements_select_own_rep"
on public.stock_movements for select
using (location_type = 'rep' and location_id = auth.uid());
-- لا Policy لـ INSERT/UPDATE/DELETE: سجل تدقيق Append-only، يُكتب فقط داخل RPC Functions.

-- ========== customers / customer_reps ==========
create policy "customers_select_admin_or_accountant"
on public.customers for select
using (public.auth_is_admin_or_accountant());

create policy "customers_select_own_rep"
on public.customers for select
using (
  exists (
    select 1 from public.customer_reps cr
    where cr.customer_id = customers.id and cr.rep_id = auth.uid()
  )
);

create policy "customers_manage_admin"
on public.customers for all
using (public.auth_is_admin())
with check (public.auth_is_admin());

create policy "customers_insert_rep"
on public.customers for insert
to authenticated
with check (public.auth_is_rep());

create policy "customer_reps_select_admin_or_accountant"
on public.customer_reps for select
using (public.auth_is_admin_or_accountant());

create policy "customer_reps_select_own_rep"
on public.customer_reps for select
using (rep_id = auth.uid());

create policy "customer_reps_manage_admin"
on public.customer_reps for all
using (public.auth_is_admin())
with check (public.auth_is_admin());

create policy "customer_reps_insert_own_rep"
on public.customer_reps for insert
to authenticated
with check (rep_id = auth.uid());

-- ========== rep_inventory ==========
create policy "rep_inventory_select_admin_or_accountant"
on public.rep_inventory for select
using (public.auth_is_admin_or_accountant());

create policy "rep_inventory_select_own_rep"
on public.rep_inventory for select
using (rep_id = auth.uid());
-- لا Policy لـ INSERT/UPDATE: الرصيد يتغيّر فقط عبر RPC (نقل/بيع/إرجاع).

-- ========== invoices / invoice_items (Append-only) ==========
create policy "invoices_select_admin_or_accountant"
on public.invoices for select
using (public.auth_is_admin_or_accountant());

create policy "invoices_select_own_rep"
on public.invoices for select
using (rep_id = auth.uid());
-- لا Policy لـ INSERT/UPDATE/DELETE: عبر create_invoice_with_stock_check() فقط،
-- ولا يوجد Policy لـ DELETE إطلاقًا مهما كان الدور (راجع CLAUDE.md §4.5).

create policy "invoice_items_select_admin_or_accountant"
on public.invoice_items for select
using (public.auth_is_admin_or_accountant());

create policy "invoice_items_select_own_rep"
on public.invoice_items for select
using (
  exists (
    select 1 from public.invoices i
    where i.id = invoice_items.invoice_id and i.rep_id = auth.uid()
  )
);

-- ========== invoice_edit_requests ==========
create policy "invoice_edit_requests_select_admin"
on public.invoice_edit_requests for select
using (public.auth_is_admin());

create policy "invoice_edit_requests_select_own_rep"
on public.invoice_edit_requests for select
using (requested_by = auth.uid());

create policy "invoice_edit_requests_insert_own_rep"
on public.invoice_edit_requests for insert
to authenticated
with check (
  requested_by = auth.uid()
  and exists (select 1 from public.invoices i where i.id = invoice_id and i.rep_id = auth.uid())
);
-- المراجعة (الموافقة/الرفض) تتم عبر review_invoice_edit_request() فقط.

-- ========== credit_notes ==========
create policy "credit_notes_select_admin_or_accountant"
on public.credit_notes for select
using (public.auth_is_admin_or_accountant());

create policy "credit_notes_select_own_rep"
on public.credit_notes for select
using (
  exists (
    select 1 from public.invoices i
    where i.id = credit_notes.invoice_id and i.rep_id = auth.uid()
  )
);
-- لا Policy لـ INSERT: تُنشأ فقط داخل RPC (إلغاء بفترة السماح أو موافقة الأدمن).

-- ========== payments ==========
create policy "payments_select_admin_or_accountant"
on public.payments for select
using (public.auth_is_admin_or_accountant());

create policy "payments_select_own_rep"
on public.payments for select
using (
  exists (
    select 1 from public.customer_reps cr
    where cr.customer_id = payments.customer_id and cr.rep_id = auth.uid()
  )
);
-- لا Policy لـ INSERT: تتم عبر record_customer_payment() فقط.

-- ========== return_records / return_items ==========
create policy "return_records_select_admin_or_accountant"
on public.return_records for select
using (public.auth_is_admin_or_accountant());

create policy "return_records_select_own_rep"
on public.return_records for select
using (rep_id = auth.uid());
-- لا Policy لـ INSERT: تتم عبر process_return() فقط.

create policy "return_items_select_admin_or_accountant"
on public.return_items for select
using (public.auth_is_admin_or_accountant());

create policy "return_items_select_own_rep"
on public.return_items for select
using (
  exists (
    select 1 from public.return_records rr
    where rr.id = return_items.return_id and rr.rep_id = auth.uid()
  )
);

-- ========== system_settings ==========
create policy "system_settings_select_authenticated"
on public.system_settings for select
to authenticated
using (true);

create policy "system_settings_update_admin"
on public.system_settings for update
using (public.auth_is_admin())
with check (public.auth_is_admin());
-- لا Policy لـ INSERT/DELETE: صف وحيد يُدرج مرة واحدة عبر seed migration.

-- ========== audit_logs (Append-only) ==========
create policy "audit_logs_select_admin"
on public.audit_logs for select
using (public.auth_is_admin());
-- لا Policy لـ INSERT/UPDATE/DELETE: يُكتب فقط عبر audit_log_trigger().
