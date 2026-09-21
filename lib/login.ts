import bcrypt from "bcryptjs";
import { getPlayerByUsername, touchLogin, type Player } from "./players";
import { checkLock, clearFails, registerFail } from "./ratelimit";

export type AuthResult =
  | { ok: true; player: Player }
  | { ok: false; reason: "bad" }
  | { ok: false; reason: "locked"; minutes: number };

let dummyHash: string | null = null;

/**
 * يتحقق من اسم المستخدم وكلمة المرور مع حدّ للمحاولات.
 * rateKey مثل "tg:123" للبوت أو "ip:1.2.3.4" للموقع.
 * نفس الرسالة والزمن التقريبي سواء كان الحساب موجوداً أم لا (لمنع تخمين الأسماء).
 */
export async function authenticate(
  username: string,
  password: string,
  rateKey: string
): Promise<AuthResult> {
  const lock = await checkLock(rateKey);
  if (lock.locked) return { ok: false, reason: "locked", minutes: lock.minutes };

  const validShape =
    username.length > 0 && username.length <= 64 && password.length > 0 && password.length <= 128;

  const player = validShape ? await getPlayerByUsername(username) : null;

  if (!dummyHash) dummyHash = bcrypt.hashSync("komuy-dummy-password", 10);
  const match = await bcrypt.compare(password, player ? player.passwordHash : dummyHash);

  if (!player || !match) {
    await registerFail(rateKey);
    return { ok: false, reason: "bad" };
  }

  await clearFails(rateKey);
  await touchLogin(player.id);
  return { ok: true, player };
}

export function getClientIp(h: Headers) {
  const fwd = h.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return h.get("x-real-ip") ?? "unknown";
}
