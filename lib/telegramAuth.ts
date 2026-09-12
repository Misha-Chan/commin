import { createHmac } from "node:crypto";

export interface TelegramWebAppUser {
  id: number;
  username?: string;
  first_name?: string;
  last_name?: string;
}

/**
 * يتحقق من صحة initData القادمة من Telegram Web App حسب خوارزمية تيليجرام الرسمية:
 * https://core.telegram.org/bots/webapps#validating-data-received-via-the-web-app
 * يعيد بيانات المستخدم إذا كان التوقيع صحيحاً، أو null إذا لم يكن كذلك.
 */
export function verifyTelegramWebAppData(
  initData: string,
  botToken: string,
  maxAgeSeconds = 60 * 60 * 24 // صلاحية يوم كامل
): TelegramWebAppUser | null {
  if (!initData) return null;

  const params = new URLSearchParams(initData);
  const hash = params.get("hash");
  if (!hash) return null;
  params.delete("hash");

  const dataCheckString = [...params.entries()]
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([key, value]) => `${key}=${value}`)
    .join("\n");

  const secretKey = createHmac("sha256", "WebAppData").update(botToken).digest();
  const computedHash = createHmac("sha256", secretKey).update(dataCheckString).digest("hex");

  if (computedHash !== hash) return null;

  const authDate = Number(params.get("auth_date") ?? "0");
  if (authDate && Date.now() / 1000 - authDate > maxAgeSeconds) return null;

  const userRaw = params.get("user");
  if (!userRaw) return null;

  try {
    const user = JSON.parse(userRaw);
    if (typeof user?.id !== "number") return null;
    return user as TelegramWebAppUser;
  } catch {
    return null;
  }
}
