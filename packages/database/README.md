# packages/database

كل ما يخص Supabase (PostgreSQL) لهذا المستودع: المخطط، RLS Policies، RPC Functions، والأنواع المولّدة.

## البنية

- `migrations/` — ملفات SQL مرقّمة ومتسلسلة (Versioned)، تُطبَّق بالترتيب عبر Supabase CLI:
  - `20260813120000_extensions_and_helpers.sql` — Extensions + دوال مساعدة لقراءة دور المستخدم (`auth_role()`, `auth_is_admin()`...)
  - `20260813120001_schema.sql` — كل الجداول والـ Enums والفهارس (راجع requirements.md §13)
  - `20260813120002_triggers.sql` — `updated_at` التلقائي، إنشاء profile عند التسجيل، مزامنة الدور مع JWT، سجل التدقيق (`audit_logs`)
  - `20260813120003_rls_policies.sql` — RLS لكل جدول (Deny by default)
  - `20260813120004_public_views.sql` — Views العامة (anon): `public_store_locations`, `public_products`, `public_categories`
  - `20260813120005_rpc_functions.sql` — العمليات الحرجة (فاتورة بيع، فاتورة شراء، نقل مخزون، تحصيل، مرتجع، إلغاء/تعديل فاتورة)
  - `20260813120006_seed_system_settings.sql` — صف `system_settings` الوحيد
- `policies/` — نسخة قابلة للقراءة (Markdown) من RLS Policies، لمن لا يريد قراءة SQL مباشرة.
- `types.ts` — أنواع TypeScript تُولَّد تلقائيًا من قاعدة البيانات، **لا تُعدَّل يدويًا أبدًا**.

## قرار تقني: أين يُخزَّن دور المستخدم بالـ JWT؟

الحقل العلوي `role` بالـ JWT محجوز من PostgREST/Supabase للتبديل بين أدوار قاعدة
البيانات (`anon` / `authenticated` / `service_role`). لذلك دور التطبيق
(admin/accountant/rep) يُخزَّن داخل `app_metadata.role`، ويُقرأ عبر
`public.auth_role()` (`auth.jwt() -> 'app_metadata' ->> 'role'`) — وليس عبر
`auth.jwt() ->> 'role'` مباشرة كما بالمثال التوضيحي بـ CLAUDE.md §4.2. المزامنة
من `profiles.role` إلى `app_metadata` تلقائية عبر trigger
(`sync_role_to_app_metadata`، بملف `20260813120002_triggers.sql`).

## توليد الأنواع (بعد ربط مشروع Supabase فعلي)

```bash
supabase gen types typescript --project-id <project-id> > packages/database/types.ts
```

## تطبيق الـ Migrations

```bash
supabase link --project-ref <project-ref>
supabase db push
```
