"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { PLAYER_COOKIE, PLAYER_TTL_SECONDS, buildPlayerToken } from "@/lib/auth";
import { authenticate, getClientIp } from "@/lib/login";
import { passwordStamp } from "@/lib/players";

const PAGE = "/con/dskl/npn";

export async function loginPlayer(formData: FormData) {
  const username = String(formData.get("username") ?? "").trim();
  const password = String(formData.get("password") ?? "").trim();

  const result = await authenticate(username, password, `ip:${getClientIp(headers())}`);

  if (!result.ok) {
    if (result.reason === "locked") redirect(`${PAGE}?e=locked&m=${result.minutes}`);
    redirect(`${PAGE}?e=bad`);
  }

  cookies().set(PLAYER_COOKIE, await buildPlayerToken(result.player.id, passwordStamp(result.player.passwordHash)), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: PAGE,
    maxAge: PLAYER_TTL_SECONDS,
  });
  redirect(PAGE);
}

export async function logoutPlayer() {
  cookies().set(PLAYER_COOKIE, "", { path: PAGE, maxAge: 0 });
  redirect(PAGE);
}
