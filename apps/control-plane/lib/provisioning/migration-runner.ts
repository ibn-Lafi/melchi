import "server-only";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { Client } from "pg";

// يعيد تشغيل نفس منطق packages/database/tests/run.sh (تطبيق كل ملفات
// migrations/*.sql بالترتيب) لكن على اتصال Postgres مباشر بمشروع Supabase
// حقيقي جديد بدل قاعدة postgres محلية — بدون تحميل supabase-stub.sql، لأن
// auth/storage الحقيقيين موجودان مسبقًا بأي مشروع Supabase فعلي.
//
// مصدر الحقيقة الوحيد لمخطط قاعدة بيانات كل عميل هو packages/database —
// هذه الوحدة لا تكرر أي SQL، فقط تقرأ وتُشغّل نفس الملفات.
const TENANT_MIGRATIONS_DIR = path.join(__dirname, "../../../../packages/database/migrations");

function listMigrationFiles(): string[] {
  return readdirSync(TENANT_MIGRATIONS_DIR)
    .filter((file) => file.endsWith(".sql"))
    .sort();
}

/**
 * يشغّل migrations/*.sql بالترتيب على مشروع Supabase عميل جديد. يدعم
 * الاستئناف بعد فشل جزئي (resumeAfter: اسم آخر ملف نجح تطبيقه بمحاولة
 * سابقة — يبدأ بعده مباشرة بدل تكرار "الجدول موجود مسبقًا")، ويبلّغ
 * onFileApplied فور نجاح كل ملف حتى يحفظ orchestrator التقدّم أولًا بأول.
 */
export async function runTenantMigrations(
  connectionString: string,
  options: { resumeAfter?: string | null; onFileApplied?: (fileName: string) => Promise<void> } = {},
): Promise<void> {
  const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });
  await client.connect();

  try {
    const files = listMigrationFiles();
    const startIndex = options.resumeAfter ? files.indexOf(options.resumeAfter) + 1 : 0;
    if (options.resumeAfter && startIndex === 0) {
      throw new Error(`ملف migration المرجعي للاستئناف غير موجود ضمن القائمة الحالية: ${options.resumeAfter}`);
    }

    for (const file of files.slice(startIndex)) {
      const sql = readFileSync(path.join(TENANT_MIGRATIONS_DIR, file), "utf-8");
      try {
        await client.query(sql);
      } catch (error) {
        throw new Error(`فشل تشغيل migration "${file}": ${(error as Error).message}`);
      }
      await options.onFileApplied?.(file);
    }
  } finally {
    await client.end();
  }
}
