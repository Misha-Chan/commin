/* يشغّل تحديث القاعدة يدوياً: npm run db:migrate (ويعمل تلقائياً قبل كل build) */
try {
  if (typeof process.loadEnvFile === "function") process.loadEnvFile(".env");
} catch {
  // لا يوجد ملف .env (طبيعي على Vercel: المتغيرات موجودة أصلاً)
}

const { getClient, runMigrations } = require("../database.js");

async function main() {
  if (!process.env.TURSO_DATABASE_URL) {
    console.warn("[db] TURSO_DATABASE_URL غير معرّف — تخطّي التحديث (سيتم عند أول طلب).");
    return;
  }
  const done = await runMigrations(getClient());
  console.log(done.length ? `[db] تم تطبيق: ${done.join(", ")}` : "[db] القاعدة محدّثة بالفعل ✅");
}

main().catch((err) => {
  // لا نُفشل الـ build؛ سيُعاد المحاولة تلقائياً عند أول طلب
  console.warn("[db] تعذّر التحديث الآن:", err && err.message ? err.message : err);
});
