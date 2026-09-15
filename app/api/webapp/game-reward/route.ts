import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { users } from "@/db/schema";
import { verifyTelegramWebAppData } from "@/lib/telegramAuth";
import { transferMiko } from "@/lib/actions";

export const runtime = "nodejs";

const REWARD_BY_RESULT: Record<string, number> = {
  win: 20,
  draw: 5,
  loss: 0,
};

// أقل فاصل زمني مسموح بين مكافأتين لنفس المستخدم، لمنع طلب المكافأة
// بشكل متكرر وسريع بدون لعب فعلي.
const MIN_INTERVAL_SECONDS = 20;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { initData, result } = body as { initData?: string; result?: string };

    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (!token) {
      return NextResponse.json({ error: "إعداد الخادم غير مكتمل" }, { status: 500 });
    }

    const tgUser = verifyTelegramWebAppData(initData ?? "", token);
    if (!tgUser) {
      return NextResponse.json({ error: "تعذّر التحقق من هويتك" }, { status: 401 });
    }

    if (!result || !(result in REWARD_BY_RESULT)) {
      return NextResponse.json({ error: "نتيجة غير معروفة" }, { status: 400 });
    }

    const telegramId = String(tgUser.id);
    const [user] = await db.select().from(users).where(eq(users.telegramId, telegramId));

    if (!user || user.status !== "complete") {
      return NextResponse.json(
        { error: "أكمل تسجيل حسابك أولاً عشان تاخذ مكافآت اللعبة" },
        { status: 403 }
      );
    }

    const now = Date.now();
    if (user.lastGameRewardAt) {
      const lastMs = new Date(user.lastGameRewardAt).getTime();
      if (!Number.isNaN(lastMs) && (now - lastMs) / 1000 < MIN_INTERVAL_SECONDS) {
        return NextResponse.json({ ok: true, amount: 0, throttled: true });
      }
    }

    await db
      .update(users)
      .set({ lastGameRewardAt: new Date(now).toISOString() })
      .where(eq(users.telegramId, telegramId));

    const amount = REWARD_BY_RESULT[result];
    if (amount > 0) {
      await transferMiko(telegramId, amount, "لعبة حرب الأراضي");
    }

    const [updated] = await db.select().from(users).where(eq(users.telegramId, telegramId));

    return NextResponse.json({ ok: true, amount, newBalance: updated?.mikoBalance ?? null });
  } catch (err) {
    console.error("Game reward error:", err);
    return NextResponse.json({ error: "حدث خطأ غير متوقع" }, { status: 500 });
  }
}
