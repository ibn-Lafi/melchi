-- ========== بيانات ضريبية للمورد (نفس نمط customer_tax_fields) ==========
alter table public.suppliers add column if not exists commercial_registration_number text;
alter table public.suppliers add column if not exists vat_number text;

-- ========== ربط المنتج بمورد رئيسي (اختياري) ==========
-- مورد افتراضي واحد لكل منتج، وليس علاقة متعددة — يكفي حاليًا لعرض "منتجات
-- هذا المورد" بصفحة تفاصيل المورد. on delete set null لأن حذف مورد لاحقًا
-- (لو أُتيح مستقبلًا) لا يجوز أن يحذف المنتج نفسه أو يفشل بسببه.
alter table public.products
  add column if not exists supplier_id uuid references public.suppliers (id) on delete set null;
create index if not exists products_supplier_id_idx on public.products (supplier_id);

-- ========== مرفق فاتورة الشراء (صورة/PDF للمستند الأصلي) ==========
-- يُخزَّن مسار الملف بالـ bucket فقط (وليس رابطًا عامًا) لأن المرفق يحتوي
-- تفاصيل تكلفة حسّاسة — القراءة تتم عبر signed URL يُولَّد وقت الطلب فقط
-- لصاحب صلاحية manage_purchases (راجع سياسات storage.objects أدناه).
alter table public.purchase_invoices add column if not exists attachment_path text;

-- تحديث المرفق يتم حصرًا عبر هذه الدالة (وليس UPDATE مباشر) لأن جدول
-- purchase_invoices ليس له أي RLS Policy لـ UPDATE أصلًا (معاملاته الحرجة
-- تمر فقط عبر create_purchase_invoice) — نفس مبدأ set_warehouse_stock_quantity.
create or replace function public.set_purchase_invoice_attachment(
  p_purchase_invoice_id uuid,
  p_attachment_path text
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.auth_has_permission('manage_purchases') then
    raise exception 'غير مصرح لك بتحديث مرفق فاتورة الشراء';
  end if;

  update public.purchase_invoices
  set attachment_path = p_attachment_path
  where id = p_purchase_invoice_id;

  if not found then
    raise exception 'فاتورة الشراء غير موجودة';
  end if;
end;
$$;

-- ========== bucket خاص (غير عام) لمرفقات فواتير الشراء ==========
insert into storage.buckets (id, name, public)
values ('purchase-invoice-attachments', 'purchase-invoice-attachments', false)
on conflict (id) do nothing;

drop policy if exists "purchase_invoice_attachments_manage" on storage.objects;
create policy "purchase_invoice_attachments_manage"
on storage.objects for all
to authenticated
using (bucket_id = 'purchase-invoice-attachments' and public.auth_has_permission('manage_purchases'))
with check (bucket_id = 'purchase-invoice-attachments' and public.auth_has_permission('manage_purchases'));
