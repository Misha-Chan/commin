"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { eq, desc, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { users, events, problems, mikoTransactions } from "@/db/schema";
import { buildSessionToken, SESSION_COOKIE } from "./auth";

// ---------- المصادقة ----------
export async function login(formData: FormData) {
  const password = String(formData.get("password") ?? "");
  if (!process.env.ADMIN_PASSWORD || password !== process.env.ADMIN_PASSWORD) {
    return { error: "كلمة المرور غير صحيحة" };
  }
  const token = await buildSessionToken();
  cookies().set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
  return { error: null };
}

export async function logout() {
  cookies().delete(SESSION_COOKIE);
}

// ---------- المستخدمون والمحفظة ----------
export async function listUsers() {
  return db.select().from(users).orderBy(desc(users.createdAt));
}

export async function updateUsername(telegramId: string, newUsername: string) {
  const clean = newUsername.trim();
  if (!clean) return;
  await db.update(users).set({ accountUsername: clean }).where(eq(users.telegramId, telegramId));
  revalidatePath("/admin");
}

export async function deleteUser(telegramId: string) {
  await db.delete(users).where(eq(users.telegramId, telegramId));
  revalidatePath("/admin");
}

export async function transferMiko(telegramId: string, amount: number) {
  if (!amount) return;
  const [user] = await db.select().from(users).where(eq(users.telegramId, telegramId));
  if (!user) return;

  const newBalance = Math.max(0, user.mikoBalance + amount);
  await db.update(users).set({ mikoBalance: newBalance }).where(eq(users.telegramId, telegramId));
  await db.insert(mikoTransactions).values({ telegramId, amount, balanceAfter: newBalance });
  revalidatePath("/admin");
}

export async function listRecentTransactions(limit = 20) {
  return db.select().from(mikoTransactions).orderBy(desc(mikoTransactions.id)).limit(limit);
}

// ---------- الفعاليات ----------
export async function listEvents() {
  return db.select().from(events).orderBy(desc(events.id));
}

export async function addEvent(formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const eventDate = String(formData.get("eventDate") ?? "").trim();
  if (!title) return;

  await db.insert(events).values({
    title,
    description: description || null,
    eventDate: eventDate || null,
  });
  revalidatePath("/admin");
}

export async function deleteEvent(id: number) {
  await db.delete(events).where(eq(events.id, id));
  revalidatePath("/admin");
}

// ---------- بلاغات المشاكل ----------
export async function listProblems() {
  return db.select().from(problems).orderBy(desc(problems.id));
}

export async function countNewProblems() {
  const [row] = await db
    .select({ n: sql<number>`count(*)` })
    .from(problems)
    .where(eq(problems.status, "جديد"));
  return row?.n ?? 0;
}

export async function updateProblemStatus(id: number, status: string) {
  await db.update(problems).set({ status }).where(eq(problems.id, id));
  revalidatePath("/admin");
}
