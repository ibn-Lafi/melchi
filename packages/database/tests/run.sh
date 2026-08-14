#!/usr/bin/env bash
# اختبار تكامل قاعدة البيانات: يطبّق migrations/ فعليًا على Postgres ويتحقق من
# المسارات الحرجة (CLAUDE.md §9) عبر critical-paths.sql. يتخطّى بأمان (exit 0)
# إذا لم يوجد اتصال Postgres محليًا — CI يوفّره دائمًا عبر postgres service
# container (راجع .github/workflows/ci.yml)، فهناك الاختبار إلزامي فعليًا.
set -euo pipefail

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DB_NAME="${TEST_DB_NAME:-system2026_integration_test}"

if ! command -v psql >/dev/null 2>&1; then
  echo "psql غير متوفر — تخطي اختبارات تكامل قاعدة البيانات محليًا."
  exit 0
fi

if ! psql -Atqc "select 1" >/dev/null 2>&1; then
  echo "لا يوجد اتصال Postgres متاح (تحقق من متغيرات PGHOST/PGUSER/...) — تخطي محليًا."
  echo "CI يشغّل هذا الاختبار دائمًا عبر خدمة postgres مخصصة."
  exit 0
fi

psql -Atqc "DROP DATABASE IF EXISTS ${DB_NAME};"
psql -Atqc "CREATE DATABASE ${DB_NAME};"

export PGDATABASE="${DB_NAME}"

psql -v ON_ERROR_STOP=1 -f "${DIR}/fixtures/supabase-stub.sql"

for migration in "${DIR}"/../migrations/*.sql; do
  psql -v ON_ERROR_STOP=1 -f "${migration}"
done

psql -v ON_ERROR_STOP=1 -f "${DIR}/critical-paths.sql"

unset PGDATABASE
psql -Atqc "DROP DATABASE IF EXISTS ${DB_NAME};"
