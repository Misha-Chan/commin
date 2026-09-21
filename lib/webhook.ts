import { createHmac } from "node:crypto";
import { headers } from "next/headers";
import { BOT_NAME, getBot } from "./bot";

/** توكن سرّي يُرسل مع كل تحديث من تيليجرام (مُشتق من SESSION_SECRET) */
export function webhookSecret() {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("SESSION_SECRET غير معرّف في متغيرات البيئة");
  return createHmac("sha256", secret).update("komuy-telegram-webhook-v1").digest("hex");
}

export function resolveBaseUrl(): string {
  const env = process.env.APP_URL?.trim();
  if (env) {
    const withScheme = /^https?:\/\//i.test(env) ? env : `https://${env}`;
    return withScheme.replace(/\/+$/, "");
  }
  const h = headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  if (!host) throw new Error("تعذّر تحديد رابط الموقع، عرّف APP_URL");
  return `${h.get("x-forwarded-proto") ?? "https"}://${host}`;
}

export const webhookUrl = () => `${resolveBaseUrl()}/api/telegram`;

export type BotStatus =
  | { ok: false; error: string }
  | {
      ok: true;
      username: string;
      expectedUrl: string;
      connected: boolean;
      pending: number;
      lastError: string | null;
    };

export async function fetchBotStatus(): Promise<BotStatus> {
  try {
    const bot = getBot();
    const [me, info] = await Promise.all([bot.api.getMe(), bot.api.getWebhookInfo()]);
    const expectedUrl = webhookUrl();
    return {
      ok: true,
      username: me.username ?? "",
      expectedUrl,
      connected: info.url === expectedUrl,
      pending: info.pending_update_count,
      lastError: info.last_error_message ?? null,
    };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}

/** يربط الـ Webhook (مع التوكن السرّي) ويحدّث اسم البوت والأوامر والوصف */
export async function connectBot(): Promise<{ ok: boolean; messages: string[] }> {
  const messages: string[] = [];
  const bot = getBot();
  const url = webhookUrl();

  try {
    await bot.api.setWebhook(url, {
      secret_token: webhookSecret(),
      allowed_updates: ["message", "callback_query"],
      max_connections: 40,
    });
    messages.push(`✅ تم ربط الـ Webhook: ${url}`);
  } catch (err) {
    return { ok: false, messages: [`❌ فشل ربط الـ Webhook: ${(err as Error).message}`] };
  }

  const soft = async (label: string, fn: () => Promise<unknown>) => {
    try {
      await fn();
      messages.push(`✅ ${label}`);
    } catch (err) {
      messages.push(`⚠️ ${label} — ${(err as Error).message}`);
    }
  };

  await soft(`ضبط اسم البوت: ${BOT_NAME}`, () => bot.api.setMyName(BOT_NAME));
  await soft("ضبط قائمة الأوامر", () =>
    bot.api.setMyCommands([
      { command: "start", description: "تسجيل الدخول / عرض سجلي" },
      { command: "me", description: "عرض سجلي" },
      { command: "logout", description: "تسجيل الخروج" },
    ])
  );
  await soft("ضبط وصف البوت", () =>
    bot.api.setMyDescription("بوت Komuy: سجّل الدخول باسم المستخدم وكلمة المرور لعرض سجلك الشخصي.")
  );
  await soft("ضبط الوصف المختصر", () => bot.api.setMyShortDescription("عرض سجلات اللاعبين"));

  return { ok: true, messages };
}
