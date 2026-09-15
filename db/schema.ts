import { sql } from "drizzle-orm";
import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

// مستخدمو البوت (حساب Mokuchiro + محفظة الميكو)
export const users = sqliteTable("users", {
  telegramId: text("telegram_id").primaryKey(),
  telegramUsername: text("telegram_username"),
  fullName: text("full_name"),
  accountUsername: text("account_username").unique(),
  passwordHash: text("password_hash"),
  mikoBalance: integer("miko_balance").notNull().default(0),
  status: text("status").notNull().default("pending"), // "pending" أو "complete"
  lastGameRewardAt: text("last_game_reward_at"), // لمنع تكرار مكافأة اللعبة بسرعة غير طبيعية
  createdAt: text("created_at")
    .notNull()
    .default(sql`(current_timestamp)`),
});

// سجل تحويلات الميكو التي يقوم بها المسؤول
export const mikoTransactions = sqliteTable("miko_transactions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  telegramId: text("telegram_id").notNull(),
  amount: integer("amount").notNull(), // موجب = إضافة، سالب = خصم
  balanceAfter: integer("balance_after").notNull(),
  reason: text("reason"), // مثلاً: "تحويل من الإدارة" أو "لعبة حرب الأراضي"
  createdAt: text("created_at")
    .notNull()
    .default(sql`(current_timestamp)`),
});

// بلاغات المشاكل التي يرسلها المستخدمون عبر البوت
export const problems = sqliteTable("problems", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  telegramId: text("telegram_id").notNull(),
  accountUsername: text("account_username"),
  message: text("message").notNull(),
  status: text("status").notNull().default("جديد"), // جديد / قيد المراجعة / تم الحل
  createdAt: text("created_at")
    .notNull()
    .default(sql`(current_timestamp)`),
});

// الفعاليات الجديدة التي يضيفها المسؤول
export const events = sqliteTable("events", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  title: text("title").notNull(),
  description: text("description"),
  eventDate: text("event_date"),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(current_timestamp)`),
});

// حالة المحادثة المؤقتة (مثلاً: ننتظر من المستخدم كتابة نص بلاغه)
export const pendingActions = sqliteTable("pending_actions", {
  telegramUserId: text("telegram_user_id").primaryKey(),
  action: text("action").notNull(),
  meta: text("meta"),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`(current_timestamp)`),
});
