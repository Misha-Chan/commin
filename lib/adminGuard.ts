import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ADMIN_COOKIE, verifyAdminToken } from "./auth";

/** للصفحات: يحوّل لصفحة الدخول إذا لم تكن هناك جلسة صالحة */
export async function requireAdminPage() {
  const ok = await verifyAdminToken(cookies().get(ADMIN_COOKIE)?.value);
  if (!ok) redirect("/admin/login");
}

/** لـ Server Actions: يرمي خطأ إذا لم تكن هناك جلسة إدارة صالحة */
export async function requireAdminAction() {
  const ok = await verifyAdminToken(cookies().get(ADMIN_COOKIE)?.value);
  if (!ok) throw new Error("غير مصرّح");
}
