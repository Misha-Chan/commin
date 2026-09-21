import { ensureDatabase, getClient } from "@/database";

// 5 محاولات فاشلة خلال 15 دقيقة => قفل 15 دقيقة
const MAX_FAILS = 5;
const WINDOW_SECONDS = 15 * 60;
const LOCK_SECONDS = 15 * 60;

const nowSec = () => Math.floor(Date.now() / 1000);

async function conn() {
  await ensureDatabase();
  return getClient();
}

export async function checkLock(key: string): Promise<{ locked: boolean; minutes: number }> {
  const db = await conn();
  const res = await db.execute({
    sql: "SELECT locked_until FROM login_attempts WHERE key = ?",
    args: [key],
  });
  const until = res.rows[0] ? Number(res.rows[0].locked_until) : 0;
  const remaining = until - nowSec();
  return remaining > 0
    ? { locked: true, minutes: Math.max(1, Math.ceil(remaining / 60)) }
    : { locked: false, minutes: 0 };
}

export async function registerFail(key: string) {
  const db = await conn();
  const now = nowSec();
  const res = await db.execute({
    sql: "SELECT fails, window_start FROM login_attempts WHERE key = ?",
    args: [key],
  });
  const row = res.rows[0];

  let fails = 1;
  let windowStart = now;
  if (row && now - Number(row.window_start) <= WINDOW_SECONDS) {
    fails = Number(row.fails) + 1;
    windowStart = Number(row.window_start);
  }
  const lockedUntil = fails >= MAX_FAILS ? now + LOCK_SECONDS : 0;

  await db.execute({
    sql: `INSERT INTO login_attempts (key, fails, window_start, locked_until)
          VALUES (?, ?, ?, ?)
          ON CONFLICT(key) DO UPDATE SET
            fails = excluded.fails,
            window_start = excluded.window_start,
            locked_until = excluded.locked_until`,
    args: [key, fails, windowStart, lockedUntil],
  });
}

export async function clearFails(key: string) {
  const db = await conn();
  await db.execute({ sql: "DELETE FROM login_attempts WHERE key = ?", args: [key] });
}
