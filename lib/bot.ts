import { Bot, InlineKeyboard, type BotConfig, type Context } from "grammy";
import { authenticate } from "./login";
import { getPlayerById } from "./players";
import {
  getBotSession,
  loginSession,
  logoutSession,
  setPendingUsername,
  startLoginFlow,
} from "./botSessions";
import { chunkText, formatRecordText } from "./record";

export const BOT_NAME = "Komuy bot";

const loginKeyboard = () => new InlineKeyboard().text("🔑 تسجيل الدخول", "login");
const recordKeyboard = () =>
  new InlineKeyboard().text("🔄 تحديث", "refresh").text("🚪 تسجيل الخروج", "logout");

// بعض ضغطات الأزرار قد تصل متأخرة؛ لا نوقف الرد بسببها.
async function safeAnswer(ctx: Context) {
  try {
    await ctx.answerCallbackQuery();
  } catch {
    /* ignore */
  }
}

async function promptLogin(ctx: Context, intro?: string) {
  await startLoginFlow(String(ctx.from!.id));
  await ctx.reply(`${intro ? intro + "\n\n" : ""}أرسل اسم المستخدم الذي أعطاك إياه المسؤول 👇`);
}

async function sendWelcome(ctx: Context) {
  await promptLogin(
    ctx,
    `أهلاً بك في ${BOT_NAME} 🦊\nهذا البوت يعرض سجلك الشخصي. لتسجيل الدخول أدخل اسم المستخدم وكلمة المرور اللذين أعطاك إياهما المسؤول.`
  );
}

/** يعرض سجل المستخدم المسجّل؛ يعيد false إذا لم يكن مسجّلاً. */
async function showRecord(ctx: Context): Promise<boolean> {
  const telegramId = String(ctx.from!.id);
  const session = await getBotSession(telegramId);
  if (!session.playerId) return false;

  const player = await getPlayerById(session.playerId);
  if (!player) {
    await logoutSession(telegramId); // الحساب حُذف من لوحة الإدارة
    return false;
  }

  const chunks = chunkText(formatRecordText(player));
  for (let i = 0; i < chunks.length; i++) {
    const last = i === chunks.length - 1;
    await ctx.reply(chunks[i], last ? { reply_markup: recordKeyboard() } : undefined);
  }
  return true;
}

export function registerHandlers(bot: Bot) {
  // البوت يعمل في المحادثات الخاصة فقط (لحماية كلمات المرور من الظهور في المجموعات)
  bot.use(async (ctx, next) => {
    if (ctx.chat?.type !== "private") return;
    await next();
  });

  bot.command("start", async (ctx) => {
    if (!(await showRecord(ctx))) await sendWelcome(ctx);
  });

  bot.command("me", async (ctx) => {
    if (!(await showRecord(ctx))) await sendWelcome(ctx);
  });

  bot.command("logout", async (ctx) => {
    await logoutSession(String(ctx.from!.id));
    await ctx.reply("تم تسجيل الخروج 👋", { reply_markup: loginKeyboard() });
  });

  bot.command("cancel", async (ctx) => {
    await logoutSession(String(ctx.from!.id));
    await ctx.reply("تم الإلغاء.", { reply_markup: loginKeyboard() });
  });

  bot.callbackQuery("login", async (ctx) => {
    await safeAnswer(ctx);
    await promptLogin(ctx);
  });

  bot.callbackQuery("refresh", async (ctx) => {
    await safeAnswer(ctx);
    if (!(await showRecord(ctx))) await sendWelcome(ctx);
  });

  bot.callbackQuery("logout", async (ctx) => {
    await safeAnswer(ctx);
    await logoutSession(String(ctx.from.id));
    await ctx.reply("تم تسجيل الخروج 👋", { reply_markup: loginKeyboard() });
  });

  bot.on("message:text", async (ctx) => {
    const telegramId = String(ctx.from.id);
    const raw = ctx.message.text;
    const text = raw.trim();

    if (text.startsWith("/")) {
      await ctx.reply("أمر غير معروف. اكتب /start للبدء.");
      return;
    }

    const session = await getBotSession(telegramId);

    if (session.state === "await_username") {
      if (!text || text.length > 64) {
        await ctx.reply("اسم المستخدم غير صالح، أعد إرساله.");
        return;
      }
      await setPendingUsername(telegramId, text);
      await ctx.reply("الآن أرسل كلمة المرور 🔒\n(سأحذف رسالتك بعد قراءتها حفاظاً على خصوصيتك)");
      return;
    }

    if (session.state === "await_password") {
      // احذف رسالة كلمة المرور فوراً
      await ctx.deleteMessage().catch(() => {});

      const result = await authenticate(session.pendingUsername ?? "", text, `tg:${telegramId}`);

      if (result.ok) {
        await loginSession(telegramId, result.player.id);
        await ctx.reply("تم تسجيل الدخول بنجاح ✅");
        await showRecord(ctx);
        return;
      }

      if (result.reason === "locked") {
        await logoutSession(telegramId);
        await ctx.reply(`محاولات كثيرة خاطئة ⛔\nحاول مجدداً بعد ${result.minutes} دقيقة تقريباً.`);
        return;
      }

      await promptLogin(ctx, "اسم المستخدم أو كلمة المرور غير صحيحة ❌");
      return;
    }

    // لا يوجد إدخال متوقع
    if (session.playerId) {
      await ctx.reply("استخدم الأزرار أدناه أو اكتب /start لعرض سجلك.", {
        reply_markup: recordKeyboard(),
      });
      return;
    }
    await sendWelcome(ctx);
  });

  bot.catch(async (err) => {
    console.error("Bot error:", err.error);
    // لا نُرجع خطأ لتيليجرام حتى لا يعيد إرسال نفس التحديث
    await err.ctx.reply("حدث خطأ مؤقت، حاول مرة أخرى بعد قليل.").catch(() => {});
  });
}

export function createBot(token: string, config?: BotConfig<Context>) {
  const bot = new Bot(token, config);
  registerHandlers(bot);
  return bot;
}

let instance: Bot | null = null;

export function getBot(): Bot {
  if (!instance) {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (!token) throw new Error("TELEGRAM_BOT_TOKEN غير معرّف في متغيرات البيئة");
    instance = createBot(token);
  }
  return instance;
}
