-- دعم إعادة محاولة تزويد فاشل بأمان (Phase 2) — التزويد يحفظ حالته بشكل
-- تدريجي (وليس دفعة واحدة بالنهاية) حتى تستطيع محاولة لاحقة معرفة أين
-- توقفت بالضبط: هل مشروع Supabase أُنشئ مسبقًا؟ هل migrations طُبِّقت
-- جزئيًا؟ بدل إعادة كل شيء من الصفر (ما قد يكرر إنشاء موارد أو يفشل على
-- "الجدول موجود مسبقًا").
alter table public.tenant_infrastructure
  add column last_migration_applied text;

-- يسمح بإدراج صف tenant_infrastructure جزئي مبكرًا (فور إنشاء مشروع
-- Supabase) بدل انتظار اكتمال كل الخطوات — لذلك كل الأعمدة عدا tenant_id
-- تبقى قابلة لتكون NULL (لم تتغيّر أصلًا، فقط توضيح للسلوك الجديد).
comment on column public.tenant_infrastructure.last_migration_applied is
  'اسم آخر ملف migration نجح تطبيقه على مشروع هذا العميل — يُستخدم لاستئناف run_migrations من حيث توقفت بدل إعادة التطبيق كاملًا.';
