import { webhookCallback } from "grammy";
import { bot } from "@/lib/telegram";

export const runtime = "nodejs";

const handleUpdate = webhookCallback(bot, "std/http");

export async function POST(request: Request) {
  try {
    return await handleUpdate(request);
  } catch (err) {
    console.error("Telegram webhook error:", err);
    return new Response("error", { status: 500 });
  }
}
