import { cookies } from "next/headers";
import { PLAYER_COOKIE, parsePlayerToken } from "./auth";
import { getPlayerById, passwordStamp, type Player } from "./players";

/** اللاعب المسجّل دخوله في صفحة الويب (أو null) */
export async function currentPlayer(): Promise<Player | null> {
  const parsed = await parsePlayerToken(cookies().get(PLAYER_COOKIE)?.value);
  if (!parsed) return null;
  const player = await getPlayerById(parsed.playerId);
  if (!player) return null;
  // تغيير كلمة المرور من الإدارة يُبطل الجلسة
  return passwordStamp(player.passwordHash) === parsed.stamp ? player : null;
}
