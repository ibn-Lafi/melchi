-- ========== بيانات ضريبية اختيارية للعميل (تظهر بالفاتورة عند توفرها) ==========
-- بعض عملاء المندوبين منشآت تجارية بسجل تجاري ورقم ضريبي خاصين بها (وليس
-- شرطًا كل العملاء أفرادًا/محلات صغيرة بلا تسجيل ضريبي) — راجع CLAUDE.md
-- §4.1: عمود اختياري نص، بلا أي قيد NOT NULL، لتفادي كسر بيانات العملاء
-- الحاليين.
alter table public.customers
  add column if not exists commercial_registration_number text,
  add column if not exists vat_number text;
