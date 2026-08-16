-- ========== رقم تسلسلي لفواتير الشراء ==========
-- نفس نمط invoice_number لفواتير البيع (sequence بدون فجوات) — يسهّل
-- الرجوع لفاتورة شراء محددة والتواصل بشأنها، بدل الاعتماد على UUID فقط.

create sequence if not exists public.purchase_invoice_number_seq start 1;

alter table public.purchase_invoices add column if not exists invoice_number bigint;

-- تعبئة رجعية للصفوف الموجودة مسبقًا (إن وُجدت) مرتبة زمنيًا بترقيم متسلسل.
with ordered as (
  select id, row_number() over (order by created_at) as rn
  from public.purchase_invoices
  where invoice_number is null
)
update public.purchase_invoices pi
set invoice_number = ordered.rn
from ordered
where pi.id = ordered.id;

select setval(
  'public.purchase_invoice_number_seq',
  coalesce((select max(invoice_number) from public.purchase_invoices), 0) + 1,
  false
);

alter table public.purchase_invoices alter column invoice_number set not null;
alter table public.purchase_invoices alter column invoice_number set default nextval('public.purchase_invoice_number_seq');

create unique index if not exists purchase_invoices_invoice_number_key
  on public.purchase_invoices (invoice_number);
