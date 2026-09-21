import { timingSafeEqual } from "node:crypto";
import { webhookCallback } from "grammy";
import { getBot } from "@/lib/bot";
import { webhookSecret } from "@/lib/webhook";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

let handler: ((req: Request) => Promise<Response>) | null = null;

function validSecret(request: Request, secret: string) {
  const given = Buffer.from(request.headers.get("x-telegram-bot-api-secret-token") ?? "");
  const expected = Buffer.from(secret);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

export async function POST(request: Request) {
  try {
    const secret = webhookSecret();
    // التوكن السرّي يمنع أي جهة غير تيليجرام من إرسال تحديثات مزيّفة
    if (!validSecret(request, secret)) {
      return new Response("unauthorized", { status: 401 });
    }
    handler ??= webhookCallback(getBot(), "std/http", { secretToken: secret });
    return await handler(request);
  } catch (err) {
    console.error("Telegram webhook error:", err);
    return new Response("error", { status: 500 });
  }
}
