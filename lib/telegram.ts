import { Bot, InlineKeyboard } from "grammy";
import { eq, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { users, events, problems, pendingActions } from "@/db/schema";
import { formatMiko, flattenMikoBreakdown, mikoDenominationImageUrl } from "./miko";

const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) {
  throw new Error("TELEGRAM_BOT_TOKEN غير معرّف في متغيرات البيئة");
}

export const bot = new Bot(token);

function requireAppUrl() {
  const appUrl = process.env.APP_URL;
  if (!appUrl) {
    throw new Error("APP_URL غير معرّف في متغيرات البيئة (رابط النشر على Vercel)");
  }
  return appUrl;
}

function displayName(from: { first_name?: string; last_name?: string; username?: string }) {
  const name = [from.first_name, from.last_name].filter(Boolean).join(" ");
  return name || from.username || "بدون اسم";
}

function mainMenu() {
  return new InlineKeyboard()
    .text("💰 محفظتي", "wallet_open")
    .row()
    .text("🎉 الفعاليات الجديدة", "events_open")
    .row()
    .text("⚠️ الإبلاغ عن مشكلة", "report_open");
}

function backKeyboard() {
  return new InlineKeyboard().text("« رجوع للقائمة", "menu_main");
}

async function sendRegistrationPrompt(ctx: any) {
  const appUrl = requireAppUrl();
  const kb = new InlineKeyboard().webApp(
    "إكمال تسجيل الحساب ↑",
    `${appUrl.replace(/\/$/, "")}/webapp/register`
  );
  await ctx.reply(
    "أهلاً بك في Mokuchiro Bot Service 🦊🌸\n\nقبل ما تكمل، لازم تكمّل تسجيل حسابك (اسم مستخدم وكلمة مرور):",
    { reply_markup: kb }
  );
}

// ---------- /start ----------
bot.command("start", async (ctx) => {
  const telegramId = String(ctx.from!.id);
  const [existing] = await db.select().from(users).where(eq(users.telegramId, telegramId));

  if (!existing) {
    await db.insert(users).values({
      telegramId,
      telegramUsername: ctx.from?.username,
      fullName: displayName(ctx.from!),
      status: "pending",
    });
    await sendRegistrationPrompt(ctx);
    return;
  }

  if (existing.status !== "complete") {
    await sendRegistrationPrompt(ctx);
    return;
  }

  await ctx.reply(
    `أهلاً بك مجدداً، ${existing.accountUsername} 👋\nمعرفك: ${telegramId}`,
    { reply_markup: mainMenu() }
  );
});

bot.callbackQuery("menu_main", async (ctx) => {
  await ctx.answerCallbackQuery();
  await ctx.reply("القائمة الرئيسية:", { reply_markup: mainMenu() });
});

// ---------- محفظتي ----------
bot.callbackQuery("wallet_open", async (ctx) => {
  await ctx.answerCallbackQuery();
  const telegramId = String(ctx.from!.id);
  const [user] = await db.select().from(users).where(eq(users.telegramId, telegramId));
  const balance = user?.mikoBalance ?? 0;

  await ctx.reply(`💰 محفظتك\nالرصيد الحالي: ${formatMiko(balance)}`, {
    reply_markup: backKeyboard(),
  });

  if (balance <= 0) return;

  const appUrl = requireAppUrl();
  const flat = flattenMikoBreakdown(balance);

  for (let i = 0; i < flat.length; i += 10) {
    const chunk = flat.slice(i, i + 10);
    if (chunk.length === 1) {
      await ctx.replyWithPhoto(mikoDenominationImageUrl(appUrl, chunk[0]));
    } else {
      await ctx.replyWithMediaGroup(
        chunk.map((value) => ({
          type: "photo" as const,
          media: mikoDenominationImageUrl(appUrl, value),
        }))
      );
    }
  }
});

// ---------- الفعاليات الجديدة ----------
bot.callbackQuery("events_open", async (ctx) => {
  await ctx.answerCallbackQuery();
  const list = await db.select().from(events).orderBy(sql`id desc`);

  if (list.length === 0) {
    await ctx.reply("لا توجد فعاليات جديدة حالياً 🌸", { reply_markup: backKeyboard() });
    return;
  }

  for (const e of list) {
    const lines = [`🎉 ${e.title}`, e.description ?? "", e.eventDate ? `🗓 ${e.eventDate}` : ""].filter(
      Boolean
    );
    await ctx.reply(lines.join("\n"));
  }
  await ctx.reply("« رجوع للقائمة", { reply_markup: backKeyboard() });
});

// ---------- الإبلاغ عن مشكلة ----------
bot.callbackQuery("report_open", async (ctx) => {
  await ctx.answerCallbackQuery();
  const telegramId = String(ctx.from!.id);

  await db
    .insert(pendingActions)
    .values({ telegramUserId: telegramId, action: "awaiting_problem" })
    .onConflictDoUpdate({
      target: pendingActions.telegramUserId,
      set: { action: "awaiting_problem", updatedAt: sql`(current_timestamp)` },
    });

  await ctx.reply("اكتب المشكلة التي واجهتك في رسالة واحدة 📝");
});

// ---------- استقبال أي رسالة نصية حرة ----------
bot.on("message:text", async (ctx) => {
  const telegramId = String(ctx.from!.id);
  const [pending] = await db
    .select()
    .from(pendingActions)
    .where(eq(pendingActions.telegramUserId, telegramId));

  if (pending?.action === "awaiting_problem") {
    const [user] = await db.select().from(users).where(eq(users.telegramId, telegramId));

    await db.insert(problems).values({
      telegramId,
      accountUsername: user?.accountUsername,
      message: ctx.message.text,
    });
    await db.delete(pendingActions).where(eq(pendingActions.telegramUserId, telegramId));

    await ctx.reply("تم استلام بلاغك، شكراً لك ✅", { reply_markup: backKeyboard() });
    return;
  }

  await ctx.reply("لم أفهم طلبك 🤔 اكتب /start لعرض القائمة الرئيسية.");
});
