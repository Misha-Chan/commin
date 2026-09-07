import { sql } from "drizzle-orm";
import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

// أسئلة شائعة يجيب عليها البوت تلقائياً
export const faqs = sqliteTable("faqs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  question: text("question").notNull(),
  answer: text("answer").notNull(),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(current_timestamp)`),
});

// طلبات وشكاوى يرسلها أعضاء المجتمع عبر البوت
export const requests = sqliteTable("requests", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  telegramUserId: text("telegram_user_id").notNull(),
  username: text("username"),
  fullName: text("full_name"),
  type: text("type").notNull(), // "request" أو "complaint"
  message: text("message").notNull(),
  status: text("status").notNull().default("جديد"),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(current_timestamp)`),
});

// فعاليات ومواعيد يمكن للأعضاء التسجيل فيها
export const events = sqliteTable("events", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  title: text("title").notNull(),
  description: text("description"),
  eventDate: text("event_date").notNull(),
  location: text("location"),
  capacity: integer("capacity"),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(current_timestamp)`),
});

// تسجيلات المستخدمين في الفعاليات
export const bookings = sqliteTable("bookings", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  eventId: integer("event_id").notNull(),
  telegramUserId: text("telegram_user_id").notNull(),
  username: text("username"),
  fullName: text("full_name"),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(current_timestamp)`),
});

// حالة المحادثة المؤقتة (مثلاً: ننتظر من المستخدم كتابة نص شكواه)
export const pendingActions = sqliteTable("pending_actions", {
  telegramUserId: text("telegram_user_id").primaryKey(),
  action: text("action").notNull(),
  meta: text("meta"),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`(current_timestamp)`),
});
