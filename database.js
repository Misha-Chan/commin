/**
 * database.js — الاتصال بقاعدة Turso + التحديث التلقائي للجداول.
 *
 * كيف يعمل:
 *  - كل تعديل على بنية القاعدة يُضاف كـ "migration" جديد في آخر مصفوفة MIGRATIONS
 *    (لا تعدّل migration قديم أبداً).
 *  - عند أول طلب للموقع/البوت (وأيضاً عند `npm run build`) يقارن الملف
 *    بين ما هو مطبّق في جدول komuy_migrations وما هو معرّف هنا، ويطبّق الناقص فقط.
 *  - آمن للتشغيل المتكرر ولا يمس أي جداول قديمة في نفس القاعدة (users, events...).
 */
"use strict";

const { createClient } = require("@libsql/client");

const MIGRATIONS = [
  {
    id: 1,
    name: "create_core_tables",
    statements: [
      `CREATE TABLE IF NOT EXISTS players (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT NOT NULL COLLATE NOCASE,
        password_hash TEXT NOT NULL,
        name TEXT NOT NULL,
        age TEXT,
        country TEXT,
        wealth TEXT,
        family TEXT,
        extra_fields TEXT NOT NULL DEFAULT '[]',
        last_login_at INTEGER,
        created_at INTEGER NOT NULL DEFAULT (CAST(strftime('%s','now') AS INTEGER)),
        updated_at INTEGER NOT NULL DEFAULT (CAST(strftime('%s','now') AS INTEGER))
      )`,
      `CREATE UNIQUE INDEX IF NOT EXISTS players_username_unique ON players (username)`,
      `CREATE TABLE IF NOT EXISTS bot_sessions (
        telegram_id TEXT PRIMARY KEY,
        state TEXT NOT NULL DEFAULT 'idle',
        pending_username TEXT,
        player_id INTEGER,
        updated_at INTEGER NOT NULL
      )`,
      `CREATE INDEX IF NOT EXISTS bot_sessions_player_idx ON bot_sessions (player_id)`,
      `CREATE TABLE IF NOT EXISTS login_attempts (
        key TEXT PRIMARY KEY,
        fails INTEGER NOT NULL DEFAULT 0,
        window_start INTEGER NOT NULL,
        locked_until INTEGER NOT NULL DEFAULT 0
      )`,
    ],
  },
  // مثال لتحديث مستقبلي (فك التعليق وغيّر الرقم):
  // { id: 2, name: "add_players_notes", statements: [`ALTER TABLE players ADD COLUMN notes TEXT`] },
];

function isAlreadyAppliedError(err) {
  const msg = String((err && err.message) || err).toLowerCase();
  return msg.includes("duplicate column name") || msg.includes("already exists");
}

/** @returns {import("@libsql/client").Client} */
function getClient() {
  if (!globalThis.__komuyDbClient) {
    const url = process.env.TURSO_DATABASE_URL;
    if (!url) {
      throw new Error("TURSO_DATABASE_URL غير معرّف في متغيرات البيئة");
    }
    globalThis.__komuyDbClient = createClient({
      url,
      authToken: process.env.TURSO_AUTH_TOKEN,
    });
  }
  return globalThis.__komuyDbClient;
}

/** يطبّق أي migrations ناقصة ويعيد أسماء ما طُبّق الآن. */
async function runMigrations(client) {
  await client.execute(
    `CREATE TABLE IF NOT EXISTS komuy_migrations (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      applied_at INTEGER NOT NULL
    )`
  );
  const res = await client.execute("SELECT id FROM komuy_migrations");
  const applied = new Set(res.rows.map((r) => Number(r.id)));
  const appliedNow = [];

  for (const migration of MIGRATIONS) {
    if (applied.has(migration.id)) continue;
    for (const sql of migration.statements) {
      try {
        await client.execute(sql);
      } catch (err) {
        // تشغيل متزامن من أكثر من instance: تجاهل "موجود مسبقاً" فقط
        if (!isAlreadyAppliedError(err)) throw err;
      }
    }
    await client.execute({
      sql: "INSERT OR IGNORE INTO komuy_migrations (id, name, applied_at) VALUES (?, ?, ?)",
      args: [migration.id, migration.name, Math.floor(Date.now() / 1000)],
    });
    appliedNow.push(migration.name);
  }
  return appliedNow;
}

/** يُستدعى قبل أي استعلام؛ ينفّذ التحديث مرة واحدة فقط لكل instance. */
function ensureDatabase() {
  if (!globalThis.__komuyDbReady) {
    globalThis.__komuyDbReady = runMigrations(getClient()).catch((err) => {
      globalThis.__komuyDbReady = null; // أعد المحاولة في الطلب التالي
      throw err;
    });
  }
  return globalThis.__komuyDbReady;
}

exports.getClient = getClient;
exports.ensureDatabase = ensureDatabase;
exports.runMigrations = runMigrations;
exports.MIGRATIONS = MIGRATIONS;
