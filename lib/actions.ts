"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { eq, desc, count } from "drizzle-orm";
import { db } from "@/db/client";
import { faqs, requests, events, bookings } from "@/db/schema";
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

// ---------- الأسئلة الشائعة ----------
export async function listFaqs() {
  return db.select().from(faqs).orderBy(desc(faqs.id));
}

export async function addFaq(formData: FormData) {
  const question = String(formData.get("question") ?? "").trim();
  const answer = String(formData.get("answer") ?? "").trim();
  if (!question || !answer) return;
  await db.insert(faqs).values({ question, answer });
  revalidatePath("/admin");
}

export async function deleteFaq(id: number) {
  await db.delete(faqs).where(eq(faqs.id, id));
  revalidatePath("/admin");
}

// ---------- الطلبات والشكاوى ----------
export async function listRequests() {
  return db.select().from(requests).orderBy(desc(requests.id));
}

export async function updateRequestStatus(id: number, status: string) {
  await db.update(requests).set({ status }).where(eq(requests.id, id));
  revalidatePath("/admin");
}

// ---------- الفعاليات ----------
export async function listEvents() {
  return db.select().from(events).orderBy(desc(events.id));
}

export async function addEvent(formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const eventDate = String(formData.get("eventDate") ?? "").trim();
  const location = String(formData.get("location") ?? "").trim();
  const capacityRaw = String(formData.get("capacity") ?? "").trim();
  if (!title || !eventDate) return;

  await db.insert(events).values({
    title,
    description: description || null,
    eventDate,
    location: location || null,
    capacity: capacityRaw ? Number(capacityRaw) : null,
  });
  revalidatePath("/admin");
}

export async function deleteEvent(id: number) {
  await db.delete(events).where(eq(events.id, id));
  revalidatePath("/admin");
}

export async function countBookings(eventId: number) {
  const [row] = await db
    .select({ n: count() })
    .from(bookings)
    .where(eq(bookings.eventId, eventId));
  return row?.n ?? 0;
}
