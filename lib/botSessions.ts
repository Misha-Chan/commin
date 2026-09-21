import { ensureDatabase, getClient } from "@/database";

export type BotState = "idle" | "await_username" | "await_password";

export type BotSession = {
  telegramId: string;
  state: BotState;
  pendingUsername: string | null;
  playerId: number | null;
};

// حالات انتظار الإدخال تنتهي بعد 10 دقائق
const FLOW_TTL_SECONDS = 10 * 60;

const nowSec = () => Math.floor(Date.now() / 1000);

async function conn() {
  await ensureDatabase();
  return getClient();
}

async function save(s: BotSession) {
  const db = await conn();
  await db.execute({
    sql: `INSERT INTO bot_sessions (telegram_id, state, pending_username, player_id, updated_at)
          VALUES (?, ?, ?, ?, ?)
          ON CONFLICT(telegram_id) DO UPDATE SET
            state = excluded.state,
            pending_username = excluded.pending_username,
            player_id = excluded.player_id,
            updated_at = excluded.updated_at`,
    args: [s.telegramId, s.state, s.pendingUsername, s.playerId, nowSec()],
  });
}

export async function getBotSession(telegramId: string): Promise<BotSession> {
  const db = await conn();
  const res = await db.execute({
    sql: "SELECT * FROM bot_sessions WHERE telegram_id = ?",
    args: [telegramId],
  });
  const row = res.rows[0];
  if (!row) return { telegramId, state: "idle", pendingUsername: null, playerId: null };

  let state = String(row.state) as BotState;
  const stale = nowSec() - Number(row.updated_at) > FLOW_TTL_SECONDS;
  if (state !== "idle" && stale) state = "idle";

  return {
    telegramId,
    state,
    pendingUsername: state === "await_password" ? (row.pending_username as string | null) : null,
    playerId: row.player_id === null ? null : Number(row.player_id),
  };
}

export async function startLoginFlow(telegramId: string) {
  await save({ telegramId, state: "await_username", pendingUsername: null, playerId: null });
}

export async function setPendingUsername(telegramId: string, username: string) {
  await save({ telegramId, state: "await_password", pendingUsername: username, playerId: null });
}

export async function loginSession(telegramId: string, playerId: number) {
  await save({ telegramId, state: "idle", pendingUsername: null, playerId });
}

export async function logoutSession(telegramId: string) {
  const db = await conn();
  await db.execute({ sql: "DELETE FROM bot_sessions WHERE telegram_id = ?", args: [telegramId] });
}
