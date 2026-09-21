import { createHash } from "node:crypto";
import bcrypt from "bcryptjs";
import type { Row } from "@libsql/client";
import { ensureDatabase, getClient } from "@/database";

export type ExtraField = { label: string; value: string };

export type Player = {
  id: number;
  username: string;
  passwordHash: string;
  name: string;
  age: string | null;
  country: string | null;
  wealth: string | null;
  family: string | null;
  extraFields: ExtraField[];
  lastLoginAt: number | null;
  createdAt: number;
  updatedAt: number;
};

export type PlayerInput = {
  username: string;
  name: string;
  age: string | null;
  country: string | null;
  wealth: string | null;
  family: string | null;
  extraFields: ExtraField[];
};

const nowSec = () => Math.floor(Date.now() / 1000);

async function conn() {
  await ensureDatabase();
  return getClient();
}

function strOrNull(v: unknown): string | null {
  return v === null || v === undefined ? null : String(v);
}

function parseExtras(raw: unknown): ExtraField[] {
  try {
    const arr = JSON.parse(String(raw ?? "[]"));
    if (!Array.isArray(arr)) return [];
    return arr
      .filter((x) => x && typeof x.label === "string" && typeof x.value === "string")
      .map((x) => ({ label: x.label as string, value: x.value as string }));
  } catch {
    return [];
  }
}

function rowToPlayer(row: Row): Player {
  return {
    id: Number(row.id),
    username: String(row.username),
    passwordHash: String(row.password_hash),
    name: String(row.name),
    age: strOrNull(row.age),
    country: strOrNull(row.country),
    wealth: strOrNull(row.wealth),
    family: strOrNull(row.family),
    extraFields: parseExtras(row.extra_fields),
    lastLoginAt: row.last_login_at === null ? null : Number(row.last_login_at),
    createdAt: Number(row.created_at),
    updatedAt: Number(row.updated_at),
  };
}

/** بصمة قصيرة لكلمة المرور الحالية (تُستخدم لإبطال الجلسات عند تغييرها) */
export function passwordStamp(passwordHash: string) {
  return createHash("sha256").update(passwordHash).digest("hex").slice(0, 16);
}

export function isUniqueViolation(err: unknown) {
  return String((err as Error)?.message ?? err).toUpperCase().includes("UNIQUE");
}

export async function listPlayers(): Promise<Player[]> {
  const db = await conn();
  const res = await db.execute("SELECT * FROM players ORDER BY id DESC");
  return res.rows.map(rowToPlayer);
}

export async function getPlayerById(id: number): Promise<Player | null> {
  const db = await conn();
  const res = await db.execute({ sql: "SELECT * FROM players WHERE id = ?", args: [id] });
  return res.rows[0] ? rowToPlayer(res.rows[0]) : null;
}

export async function getPlayerByUsername(username: string): Promise<Player | null> {
  const db = await conn();
  const res = await db.execute({
    sql: "SELECT * FROM players WHERE username = ? COLLATE NOCASE",
    args: [username],
  });
  return res.rows[0] ? rowToPlayer(res.rows[0]) : null;
}

export async function createPlayer(input: PlayerInput, password: string): Promise<number> {
  const db = await conn();
  const hash = await bcrypt.hash(password, 10);
  const ts = nowSec();
  const res = await db.execute({
    sql: `INSERT INTO players
      (username, password_hash, name, age, country, wealth, family, extra_fields, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      input.username,
      hash,
      input.name,
      input.age,
      input.country,
      input.wealth,
      input.family,
      JSON.stringify(input.extraFields),
      ts,
      ts,
    ],
  });
  return Number(res.lastInsertRowid);
}

/** يحدّث السجل؛ إذا مُرّرت كلمة مرور جديدة تُستبدل وتُنهى جلسات هذا اللاعب في البوت. */
export async function updatePlayer(
  id: number,
  input: PlayerInput,
  newPassword: string | null
): Promise<boolean> {
  const db = await conn();
  const ts = nowSec();
  const fields = [
    input.username,
    input.name,
    input.age,
    input.country,
    input.wealth,
    input.family,
    JSON.stringify(input.extraFields),
    ts,
  ];

  if (newPassword) {
    const hash = await bcrypt.hash(newPassword, 10);
    const results = await db.batch(
      [
        {
          sql: `UPDATE players SET username=?, name=?, age=?, country=?, wealth=?, family=?,
                extra_fields=?, updated_at=?, password_hash=? WHERE id=?`,
          args: [...fields, hash, id],
        },
        { sql: "DELETE FROM bot_sessions WHERE player_id = ?", args: [id] },
      ],
      "write"
    );
    return results[0].rowsAffected > 0;
  }

  const res = await db.execute({
    sql: `UPDATE players SET username=?, name=?, age=?, country=?, wealth=?, family=?,
          extra_fields=?, updated_at=? WHERE id=?`,
    args: [...fields, id],
  });
  return res.rowsAffected > 0;
}

export async function deletePlayer(id: number) {
  const db = await conn();
  await db.batch(
    [
      { sql: "DELETE FROM bot_sessions WHERE player_id = ?", args: [id] },
      { sql: "DELETE FROM players WHERE id = ?", args: [id] },
    ],
    "write"
  );
}

export async function touchLogin(id: number) {
  const db = await conn();
  await db.execute({ sql: "UPDATE players SET last_login_at = ? WHERE id = ?", args: [nowSec(), id] });
}
