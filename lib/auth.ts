// توقيع/تحقق الجلسات — يعتمد Web Crypto فقط ليعمل داخل الـ middleware أيضاً.

export const ADMIN_COOKIE = "komuy_admin";
export const PLAYER_COOKIE = "komuy_player";
export const ADMIN_TTL_SECONDS = 60 * 60 * 24 * 7;
export const PLAYER_TTL_SECONDS = 60 * 60 * 24 * 7;

const encoder = new TextEncoder();

function requireSecret() {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("SESSION_SECRET غير معرّف في متغيرات البيئة");
  return secret;
}

function toHex(buffer: ArrayBuffer) {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function sign(payload: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(requireSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  return toHex(await crypto.subtle.sign("HMAC", key, encoder.encode(payload)));
}

// مقارنة بزمن ثابت
function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

const nowSec = () => Math.floor(Date.now() / 1000);

function freshEnough(iat: number, ttl: number) {
  if (!Number.isInteger(iat)) return false;
  const age = nowSec() - iat;
  return age >= -60 && age <= ttl;
}

// ---------- جلسة المسؤول ----------
export async function buildAdminToken() {
  const payload = `admin.${nowSec()}`;
  return `${payload}.${await sign(payload)}`;
}

export async function verifyAdminToken(token: string | undefined | null) {
  try {
    if (!token) return false;
    const parts = token.split(".");
    if (parts.length !== 3 || parts[0] !== "admin") return false;
    if (!freshEnough(Number(parts[1]), ADMIN_TTL_SECONDS)) return false;
    return safeEqual(await sign(`${parts[0]}.${parts[1]}`), parts[2]);
  } catch {
    return false;
  }
}

// ---------- جلسة اللاعب (صفحة الويب) ----------
// stamp = بصمة كلمة المرور الحالية؛ تغيير كلمة المرور يُبطل الجلسات القديمة.
export async function buildPlayerToken(playerId: number, stamp: string) {
  const payload = `player.${playerId}.${stamp}.${nowSec()}`;
  return `${payload}.${await sign(payload)}`;
}

export async function parsePlayerToken(
  token: string | undefined | null
): Promise<{ playerId: number; stamp: string } | null> {
  try {
    if (!token) return null;
    const parts = token.split(".");
    if (parts.length !== 5 || parts[0] !== "player") return null;
    const playerId = Number(parts[1]);
    if (!Number.isInteger(playerId) || playerId <= 0) return null;
    if (!freshEnough(Number(parts[3]), PLAYER_TTL_SECONDS)) return null;
    const expected = await sign(parts.slice(0, 4).join("."));
    if (!safeEqual(expected, parts[4])) return null;
    return { playerId, stamp: parts[2] };
  } catch {
    return null;
  }
}
