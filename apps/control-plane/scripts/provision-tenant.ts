// سكربت CLI لتزويد عميل SaaS جديد يدويًا (Phase 1 — قبل ربطه بـ Stripe
// وصفحة تسجيل عامة لاحقًا). الاستخدام:
//   pnpm --filter control-plane provision -- --company="اسم الشركة" --name="اسم المسؤول" --email=owner@example.com
//
// يقرأ متغيرات البيئة اللازمة (SUPABASE_MANAGEMENT_API_TOKEN،
// SUPABASE_ORGANIZATION_ID، RAILWAY_API_TOKEN، CONTROL_PLANE_SUPABASE_URL،
// CONTROL_PLANE_SUPABASE_SERVICE_ROLE_KEY، CONTROL_PLANE_GITHUB_REPO) من ملف
// .env.control-plane.local غير المُدار بـ git إن وُجد، أو من بيئة التشغيل
// مباشرة.
import { provisionNewTenant } from "../lib/provisioning/orchestrator";

try {
  process.loadEnvFile(".env.control-plane.local");
} catch {
  // الملف اختياري — قد تُمرَّر المتغيرات من بيئة التشغيل مباشرة بدلًا منه.
}

function parseArgs(): { companyName: string; contactName: string; contactEmail: string } {
  const values: Record<string, string> = {};
  for (const arg of process.argv.slice(2)) {
    const match = arg.match(/^--([a-zA-Z-]+)=(.*)$/);
    if (match) values[match[1]!] = match[2]!;
  }

  const companyName = values.company;
  const contactName = values.name;
  const contactEmail = values.email;

  if (!companyName || !contactName || !contactEmail) {
    console.error(
      'الاستخدام: pnpm --filter control-plane provision -- --company="اسم الشركة" --name="اسم المسؤول" --email=owner@example.com',
    );
    process.exit(1);
  }

  return { companyName, contactName, contactEmail };
}

async function main() {
  const input = parseArgs();
  console.log(`بدء تزويد عميل جديد: ${input.companyName} (${input.contactEmail})...`);

  const result = await provisionNewTenant(input);

  console.log("تم التزويد بنجاح ✓");
  console.log(`  admin: ${result.adminAppUrl}`);
  console.log(`  rep:   ${result.repAppUrl}`);
  console.log(`  store: ${result.storeAppUrl}`);
  console.log(`  بريد الأدمن: ${result.adminEmail}`);
  console.log(
    `  كلمة المرور المؤقتة: ${result.adminTemporaryPassword ?? "(الحساب كان موجودًا مسبقًا — لا كلمة مرور جديدة)"}`,
  );
}

main().catch((error) => {
  console.error("فشل التزويد:", error);
  process.exit(1);
});
