import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { db } from "@/db/client";
import { users } from "@/db/schema";
import { verifyTelegramWebAppData } from "@/lib/telegramAuth";
import { bot } from "@/lib/telegram";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { initData, username, password } = body as {
      initData?: string;
      username?: string;
      password?: string;
    };

    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (!token) {
      return NextResponse.json({ error: "إعداد الخادم غير مكتمل" }, { status: 500 });
    }

    const tgUser = verifyTelegramWebAppData(initData ?? "", token);
    if (!tgUser) {
      return NextResponse.json({ error: "تعذّر التحقق من هويتك، جرّب فتح النموذج من داخل البوت مجدداً" }, { status: 401 });
    }

    const cleanUsername = String(username ?? "").trim();
    const cleanPassword = String(password ?? "");

    if (cleanUsername.length < 3 || cleanUsername.length > 32) {
      return NextResponse.json({ error: "اسم المستخدم يجب أن يكون بين 3 و32 حرفاً" }, { status: 400 });
    }
    if (!/^[a-zA-Z0-9_\u0600-\u06FF]+$/.test(cleanUsername)) {
      return NextResponse.json({ error: "اسم المستخدم يحتوي رموزاً غير مسموحة" }, { status: 400 });
    }
    if (cleanPassword.length < 6) {
      return NextResponse.json({ error: "كلمة المرور يجب أن تكون 6 أحرف على الأقل" }, { status: 400 });
    }

    const telegramId = String(tgUser.id);

    const [usernameTaken] = await db
      .select()
      .from(users)
      .where(eq(users.accountUsername, cleanUsername));
    if (usernameTaken && usernameTaken.telegramId !== telegramId) {
      return NextResponse.json({ error: "اسم المستخدم هذا محجوز، اختر اسماً آخر" }, { status: 409 });
    }

    const passwordHash = await bcrypt.hash(cleanPassword, 10);
    const fullName = [tgUser.first_name, tgUser.last_name].filter(Boolean).join(" ") || null;

    const [existing] = await db.select().from(users).where(eq(users.telegramId, telegramId));

    if (existing) {
      await db
        .update(users)
        .set({
          accountUsername: cleanUsername,
          passwordHash,
          telegramUsername: tgUser.username ?? existing.telegramUsername,
          fullName: fullName ?? existing.fullName,
          status: "complete",
        })
        .where(eq(users.telegramId, telegramId));
    } else {
      await db.insert(users).values({
        telegramId,
        telegramUsername: tgUser.username,
        fullName,
        accountUsername: cleanUsername,
        passwordHash,
        status: "complete",
      });
    }

    try {
      await bot.api.sendMessage(telegramId, "تم التسجيل بنجاح ✅\nاكتب /start للمتابعة.");
    } catch (err) {
      console.error("Failed to send Telegram confirmation:", err);
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Registration error:", err);
    return NextResponse.json({ error: "حدث خطأ غير متوقع، حاول مرة أخرى" }, { status: 500 });
  }
}
