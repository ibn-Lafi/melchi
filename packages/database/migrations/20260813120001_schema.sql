-- المخطط الكامل لقاعدة البيانات — راجع requirements.md §13 لنموذج البيانات المرجعي

-- ========== Enums ==========
create type public.user_role as enum ('admin', 'accountant', 'rep');
create type public.invoice_payment_method as enum ('cash', 'credit', 'check', 'transfer');
create type public.settlement_method as enum ('cash', 'check', 'transfer');
create type public.invoice_status as enum ('paid', 'partial', 'unpaid', 'cancelled');
create type public.purchase_payment_status as enum ('paid', 'partial', 'unpaid');
create type public.stock_movement_type as enum
  ('purchase_in', 'transfer_out', 'transfer_in', 'sale_out', 'return_in', 'write_off', 'adjustment');
create type public.stock_location_type as enum ('warehouse', 'rep');
create type public.return_condition as enum ('resalable', 'damaged', 'expired');
create type public.edit_request_status as enum ('pending', 'approved', 'rejected');
create type public.audit_action as enum ('insert', 'update', 'delete');

-- ========== profiles (يمتد auth.users من Supabase Auth) ==========
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  name text not null,
  email text,
  phone text,
  role public.user_role not null default 'rep',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ========== categories ==========
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ========== units ==========
create table public.units (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ========== products ==========
create table public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  price numeric(14, 2) not null check (price >= 0),
  average_cost numeric(14, 4) not null default 0 check (average_cost >= 0),
  category_id uuid references public.categories (id) on delete set null,
  image_url text,
  visible_in_store boolean not null default true,
  has_expiry boolean not null default false,
  expiry_date date,
  base_unit_id uuid not null references public.units (id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint expiry_date_required_when_has_expiry
    check (has_expiry = false or expiry_date is not null)
);
create index products_category_id_idx on public.products (category_id);

-- ========== product_units (وحدات بديلة لكل منتج + معامل التحويل) ==========
create table public.product_units (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  unit_id uuid not null references public.units (id) on delete restrict,
  conversion_factor_to_base numeric(14, 4) not null check (conversion_factor_to_base > 0),
  unit_price numeric(14, 2) check (unit_price >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (product_id, unit_id)
);

-- ========== suppliers ==========
create table public.suppliers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text,
  address text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ========== purchase_invoices ==========
create table public.purchase_invoices (
  id uuid primary key default gen_random_uuid(),
  supplier_id uuid not null references public.suppliers (id) on delete restrict,
  invoice_date timestamptz not null default now(),
  subtotal numeric(14, 2) not null default 0,
  total_amount numeric(14, 2) not null default 0,
  payment_status public.purchase_payment_status not null default 'unpaid',
  created_by uuid not null references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index purchase_invoices_supplier_id_idx on public.purchase_invoices (supplier_id);

-- ========== purchase_invoice_items ==========
create table public.purchase_invoice_items (
  id uuid primary key default gen_random_uuid(),
  purchase_invoice_id uuid not null references public.purchase_invoices (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete restrict,
  unit_id uuid not null references public.units (id) on delete restrict,
  quantity_in_unit numeric(14, 4) not null check (quantity_in_unit > 0),
  quantity_in_base_unit numeric(14, 4) not null check (quantity_in_base_unit > 0),
  unit_cost numeric(14, 4) not null check (unit_cost >= 0),
  subtotal numeric(14, 2) not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index purchase_invoice_items_purchase_invoice_id_idx on public.purchase_invoice_items (purchase_invoice_id);
create index purchase_invoice_items_product_id_idx on public.purchase_invoice_items (product_id);

-- ========== supplier_payments ==========
create table public.supplier_payments (
  id uuid primary key default gen_random_uuid(),
  purchase_invoice_id uuid references public.purchase_invoices (id) on delete set null,
  supplier_id uuid not null references public.suppliers (id) on delete restrict,
  amount numeric(14, 2) not null check (amount > 0),
  payment_date timestamptz not null default now(),
  method public.settlement_method not null,
  recorded_by uuid not null references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index supplier_payments_supplier_id_idx on public.supplier_payments (supplier_id);

-- ========== warehouse_stock (المخزن المركزي) ==========
create table public.warehouse_stock (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null unique references public.products (id) on delete cascade,
  quantity_available numeric(14, 4) not null default 0 check (quantity_available >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ========== stock_transfers ==========
create table public.stock_transfers (
  id uuid primary key default gen_random_uuid(),
  rep_id uuid not null references public.profiles (id),
  transfer_date timestamptz not null default now(),
  created_by uuid not null references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index stock_transfers_rep_id_idx on public.stock_transfers (rep_id);

-- ========== stock_transfer_items ==========
create table public.stock_transfer_items (
  id uuid primary key default gen_random_uuid(),
  transfer_id uuid not null references public.stock_transfers (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete restrict,
  quantity numeric(14, 4) not null check (quantity > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index stock_transfer_items_transfer_id_idx on public.stock_transfer_items (transfer_id);

-- ========== stock_movements (سجل تدقيق شامل — Append-only) ==========
create table public.stock_movements (
  id uuid primary key default gen_random_uuid(),
  movement_type public.stock_movement_type not null,
  reference_table text not null,
  reference_id uuid not null,
  product_id uuid not null references public.products (id) on delete restrict,
  location_type public.stock_location_type not null,
  location_id uuid,
  quantity_change numeric(14, 4) not null,
  balance_after numeric(14, 4) not null,
  performed_by uuid references public.profiles (id),
  created_at timestamptz not null default now()
);
create index stock_movements_product_id_idx on public.stock_movements (product_id);
create index stock_movements_location_idx on public.stock_movements (location_type, location_id);
create index stock_movements_reference_idx on public.stock_movements (reference_table, reference_id);

-- ========== customers ==========
create table public.customers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  shop_name text,
  phone text,
  address text,
  notes text,
  google_maps_link text,
  show_in_store boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ========== customer_reps (Many-to-Many) ==========
create table public.customer_reps (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers (id) on delete cascade,
  rep_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (customer_id, rep_id)
);
create index customer_reps_rep_id_idx on public.customer_reps (rep_id);

-- ========== rep_inventory ==========
create table public.rep_inventory (
  id uuid primary key default gen_random_uuid(),
  rep_id uuid not null references public.profiles (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete restrict,
  quantity_available numeric(14, 4) not null default 0 check (quantity_available >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (rep_id, product_id)
);

-- ========== invoice_number sequence (بدون فجوات — متطلب ZATCA) ==========
create sequence public.invoice_number_seq start 1;

-- ========== invoices (Append-only — لا حذف مطلقًا، راجع CLAUDE.md §4.5) ==========
create table public.invoices (
  id uuid primary key default gen_random_uuid(),
  invoice_number bigint not null unique default nextval('public.invoice_number_seq'),
  rep_id uuid not null references public.profiles (id),
  customer_id uuid not null references public.customers (id),
  invoice_date timestamptz not null default now(),
  subtotal numeric(14, 2) not null,
  vat_amount numeric(14, 2) not null,
  total_amount numeric(14, 2) not null,
  qr_code_data text not null,
  payment_method public.invoice_payment_method not null,
  status public.invoice_status not null default 'unpaid',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index invoices_rep_id_idx on public.invoices (rep_id);
create index invoices_customer_id_idx on public.invoices (customer_id);

-- ========== invoice_items ==========
create table public.invoice_items (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.invoices (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete restrict,
  unit_id uuid not null references public.units (id) on delete restrict,
  quantity_in_unit numeric(14, 4) not null check (quantity_in_unit > 0),
  quantity_in_base_unit numeric(14, 4) not null check (quantity_in_base_unit > 0),
  unit_price numeric(14, 2) not null check (unit_price >= 0),
  cost_price numeric(14, 4) not null check (cost_price >= 0),
  subtotal numeric(14, 2) not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index invoice_items_invoice_id_idx on public.invoice_items (invoice_id);
create index invoice_items_product_id_idx on public.invoice_items (product_id);

-- ========== invoice_edit_requests ==========
create table public.invoice_edit_requests (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.invoices (id),
  requested_by uuid not null references public.profiles (id),
  reason text not null,
  requested_changes jsonb not null,
  status public.edit_request_status not null default 'pending',
  reviewed_by uuid references public.profiles (id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index invoice_edit_requests_invoice_id_idx on public.invoice_edit_requests (invoice_id);

-- ========== credit_notes ==========
create table public.credit_notes (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.invoices (id),
  amount numeric(14, 2) not null check (amount > 0),
  reason text not null,
  created_by uuid not null references public.profiles (id),
  note_date timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index credit_notes_invoice_id_idx on public.credit_notes (invoice_id);

-- ========== payments (تحصيلات من العملاء) ==========
create table public.payments (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid references public.invoices (id),
  customer_id uuid not null references public.customers (id),
  amount numeric(14, 2) not null check (amount > 0),
  payment_date timestamptz not null default now(),
  method public.settlement_method not null,
  recorded_by uuid not null references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index payments_customer_id_idx on public.payments (customer_id);
create index payments_invoice_id_idx on public.payments (invoice_id);

-- ========== return_records ==========
create table public.return_records (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid references public.invoices (id),
  customer_id uuid not null references public.customers (id),
  rep_id uuid references public.profiles (id),
  return_date timestamptz not null default now(),
  total_credit_amount numeric(14, 2) not null default 0,
  created_by uuid not null references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index return_records_customer_id_idx on public.return_records (customer_id);
create index return_records_invoice_id_idx on public.return_records (invoice_id);

-- ========== return_items ==========
create table public.return_items (
  id uuid primary key default gen_random_uuid(),
  return_id uuid not null references public.return_records (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete restrict,
  quantity numeric(14, 4) not null check (quantity > 0),
  unit_price numeric(14, 2) not null check (unit_price >= 0),
  condition public.return_condition not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index return_items_return_id_idx on public.return_items (return_id);

-- ========== system_settings (صف واحد فقط) ==========
create table public.system_settings (
  id smallint primary key default 1,
  company_name text not null default '',
  vat_registration_number text not null default '',
  commercial_registration_number text not null default '',
  company_address text not null default '',
  invoice_edit_grace_period_minutes integer not null default 30 check (invoice_edit_grace_period_minutes > 0),
  expiry_alert_days_threshold integer not null default 30 check (expiry_alert_days_threshold > 0),
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles (id),
  constraint system_settings_single_row check (id = 1)
);

-- ========== audit_logs (Append-only) ==========
create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  table_name text not null,
  record_id uuid,
  action public.audit_action not null,
  performed_by uuid references public.profiles (id),
  performed_at timestamptz not null default now(),
  old_values jsonb,
  new_values jsonb
);
create index audit_logs_table_record_idx on public.audit_logs (table_name, record_id);
