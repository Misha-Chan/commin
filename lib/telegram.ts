import { Bot, InlineKeyboard } from "grammy";
import { eq, count } from "drizzle-orm";
import { db } from "@/db/client";
import { faqs, requests, events, bookings, pendingActions } from "@/db/schema";

const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) {
  throw new Error("TELEGRAM_BOT_TOKEN غير معرّف في متغيرات البيئة");
}

export const bot = new Bot(token);

function mainMenu() {
  return new InlineKeyboard()
    .text("❓ الأسئلة الشائعة", "menu_faqs")
    .row()
    .text("📝 تقديم طلب", "menu_request")
    .text("📢 تقديم شكوى", "menu_complaint")
    .row()
    .text("📅 الفعاليات القادمة", "menu_events");
}

function displayName(from: { first_name?: string; last_name?: string; username?: string }) {
  const name = [from.first_name, from.last_name].filter(Boolean).join(" ");
  return name || from.username || "بدون اسم";
}

bot.command("start", async (ctx) => {
  await ctx.reply(
    "أهلاً بك 👋\nهذا بوت خدمات المجتمع، اختر ما تريد من القائمة أدناه:",
    { reply_markup: mainMenu() }
  );
});

bot.command("menu", async (ctx) => {
  await ctx.reply("القائمة الرئيسية:", { reply_markup: mainMenu() });
});

bot.callbackQuery("menu_main", async (ctx) => {
  await ctx.answerCallbackQuery();
  await ctx.reply("القائمة الرئيسية:", { reply_markup: mainMenu() });
});

// ---------- الأسئلة الشائعة ----------
bot.callbackQuery("menu_faqs", async (ctx) => {
  const list = await db.select().from(faqs).all();
  await ctx.answerCallbackQuery();

  if (list.length === 0) {
    await ctx.reply("لا توجد أسئلة شائعة مضافة حالياً.");
    return;
  }

  const kb = new InlineKeyboard();
  for (const f of list) {
    kb.text(f.question, `faq_${f.id}`).row();
  }
  kb.text("« رجوع للقائمة الرئيسية", "menu_main");
  await ctx.reply("اختر السؤال الذي يهمك:", { reply_markup: kb });
});

bot.callbackQuery(/^faq_(\d+)$/, async (ctx) => {
  const id = Number(ctx.match[1]);
  const [faq] = await db.select().from(faqs).where(eq(faqs.id, id));
  await ctx.answerCallbackQuery();
  if (faq) {
    await ctx.reply(`❓ ${faq.question}\n\n${faq.answer}`);
  }
});

// ---------- الطلبات والشكاوى ----------
bot.callbackQuery(["menu_request", "menu_complaint"], async (ctx) => {
  const isComplaint = ctx.callbackQuery.data === "menu_complaint";
  const type = isComplaint ? "complaint" : "request";
  const userId = String(ctx.from!.id);

  await db
    .insert(pendingActions)
    .values({
      telegramUserId: userId,
      action: "awaiting_message",
      meta: JSON.stringify({ type }),
    })
    .onConflictDoUpdate({
      target: pendingActions.telegramUserId,
      set: { action: "awaiting_message", meta: JSON.stringify({ type }) },
    });

  await ctx.answerCallbackQuery();
  await ctx.reply(
    `تمام، اكتب ${isComplaint ? "شكواك" : "طلبك"} في رسالة واحدة وسنقوم بمراجعتها 📝`
  );
});

// ---------- الفعاليات ----------
bot.callbackQuery("menu_events", async (ctx) => {
  const list = await db.select().from(events).all();
  await ctx.answerCallbackQuery();

  if (list.length === 0) {
    await ctx.reply("لا توجد فعاليات قادمة حالياً.");
    return;
  }

  for (const e of list) {
    const kb = new InlineKeyboard().text("سجّل الآن ✅", `book_${e.id}`);
    const lines = [
      `📅 ${e.title}`,
      e.description ?? "",
      `🗓 ${e.eventDate}`,
      e.location ? `📍 ${e.location}` : "",
    ].filter(Boolean);
    await ctx.reply(lines.join("\n"), { reply_markup: kb });
  }
});

bot.callbackQuery(/^book_(\d+)$/, async (ctx) => {
  const eventId = Number(ctx.match[1]);
  const userId = String(ctx.from!.id);
  await ctx.answerCallbackQuery();

  const [event] = await db.select().from(events).where(eq(events.id, eventId));
  if (!event) {
    await ctx.reply("هذه الفعالية لم تعد متوفرة.");
    return;
  }

  const existing = await db
    .select()
    .from(bookings)
    .where(eq(bookings.eventId, eventId))
    .all();
  const alreadyBooked = existing.some((b) => b.telegramUserId === userId);

  if (alreadyBooked) {
    await ctx.reply("أنت مسجّل بالفعل في هذه الفعالية ✅");
    return;
  }

  if (event.capacity != null) {
    const [{ n }] = await db
      .select({ n: count() })
      .from(bookings)
      .where(eq(bookings.eventId, eventId));
    if (n >= event.capacity) {
      await ctx.reply("عذراً، اكتمل عدد المقاعد لهذه الفعالية 🙏");
      return;
    }
  }

  await db.insert(bookings).values({
    eventId,
    telegramUserId: userId,
    username: ctx.from?.username,
    fullName: displayName(ctx.from!),
  });

  await ctx.reply(`تم تسجيلك في "${event.title}" بنجاح 🎉`);
});

// ---------- استقبال أي رسالة نصية حرة ----------
bot.on("message:text", async (ctx) => {
  const userId = String(ctx.from!.id);
  const [pending] = await db
    .select()
    .from(pendingActions)
    .where(eq(pendingActions.telegramUserId, userId));

  if (pending?.action === "awaiting_message") {
    const meta = pending.meta ? JSON.parse(pending.meta) : {};
    await db.insert(requests).values({
      telegramUserId: userId,
      username: ctx.from?.username,
      fullName: displayName(ctx.from!),
      type: meta.type === "complaint" ? "complaint" : "request",
      message: ctx.message.text,
    });
    await db.delete(pendingActions).where(eq(pendingActions.telegramUserId, userId));
    await ctx.reply("شكراً لك، تم استلام رسالتك وسيتم التواصل معك قريباً ✅");
    return;
  }

  await ctx.reply("لم أفهم طلبك 🤔 اكتب /menu لعرض القائمة الرئيسية.");
});
