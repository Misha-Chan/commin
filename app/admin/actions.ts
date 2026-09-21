"use server";

import { createHash, timingSafeEqual } from "node:crypto";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { ADMIN_COOKIE, ADMIN_TTL_SECONDS, buildAdminToken } from "@/lib/auth";
import { requireAdminAction } from "@/lib/adminGuard";
import { checkLock, clearFails, registerFail } from "@/lib/ratelimit";
import { getClientIp } from "@/lib/login";
import { createPlayer, deletePlayer as removePlayer, isUniqueViolation, updatePlayer } from "@/lib/players";
import { parsePlayerForm } from "@/lib/validate";
import { connectBot } from "@/lib/webhook";

type Result = { ok: true } | { ok: false; error: string };

function sameSecret(a: string, b: string) {
  const ha = createHash("sha256").update(a).digest();
  const hb = createHash("sha256").update(b).digest();
  return timingSafeEqual(ha, hb);
}

// ---------- الدخول والخروج (عامّة عمداً) ----------
export async function loginAdmin(formData: FormData) {
  const password = String(formData.get("password") ?? "");
  const expected = process.env.ADMIN_PASSWORD;
  const rateKey = `admin:${getClientIp(headers())}`;

  let error: string | null = null;

  if (!expected) {
    error = "ADMIN_PASSWORD غير معرّف في متغيرات البيئة";
  } else {
    const lock = await checkLock(rateKey);
    if (lock.locked) {
      error = `محاولات كثيرة، حاول بعد ${lock.minutes} دقيقة`;
    } else if (!sameSecret(password, expected)) {
      await registerFail(rateKey);
      error = "كلمة المرور غير صحيحة";
    }
  }

  if (error) redirect(`/admin/login?error=${encodeURIComponent(error)}`);

  await clearFails(rateKey);
  cookies().set(ADMIN_COOKIE, await buildAdminToken(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: ADMIN_TTL_SECONDS,
  });
  redirect("/admin");
}

export async function logoutAdmin() {
  cookies().delete(ADMIN_COOKIE);
  redirect("/admin/login");
}

// ---------- كل ما يلي محمي بفحص الجلسة داخل الدالة نفسها ----------
export async function savePlayer(formData: FormData): Promise<Result> {
  await requireAdminAction();

  const parsed = parsePlayerForm(formData);
  if (!parsed.ok) return parsed;

  try {
    if (parsed.id === null) {
      await createPlayer(parsed.input, parsed.password as string);
    } else {
      const updated = await updatePlayer(parsed.id, parsed.input, parsed.password);
      if (!updated) return { ok: false, error: "الحساب غير موجود (ربما حُذف)" };
    }
  } catch (err) {
    if (isUniqueViolation(err)) return { ok: false, error: "اسم المستخدم هذا مستخدم من قبل" };
    console.error("savePlayer error:", err);
    return { ok: false, error: "تعذّر الحفظ، حاول مرة أخرى" };
  }

  revalidatePath("/admin");
  return { ok: true };
}

export async function deletePlayer(id: number): Promise<Result> {
  await requireAdminAction();
  if (!Number.isInteger(id) || id <= 0) return { ok: false, error: "معرّف غير صالح" };
  await removePlayer(id);
  revalidatePath("/admin");
  return { ok: true };
}

export async function connectBotAction(): Promise<{ ok: boolean; messages: string[] }> {
  await requireAdminAction();
  try {
    const result = await connectBot();
    revalidatePath("/admin");
    return result;
  } catch (err) {
    return { ok: false, messages: [`❌ ${(err as Error).message}`] };
  }
}
