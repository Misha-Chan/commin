import { currentPlayer } from "@/lib/playerSession";
import { recordRows } from "@/lib/record";
import { loginPlayer, logoutPlayer } from "./actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "سجلي · Komuy", robots: { index: false, follow: false } };

export default async function PlayerPage({
  searchParams,
}: {
  searchParams: { e?: string; m?: string };
}) {
  const player = await currentPlayer();

  if (!player) {
    let error: string | null = null;
    if (searchParams.e === "bad") error = "اسم المستخدم أو كلمة المرور غير صحيحة";
    if (searchParams.e === "locked") {
      const minutes = Math.min(60, Math.max(1, Number(searchParams.m) || 15));
      error = `محاولات كثيرة خاطئة. حاول بعد ${minutes} دقيقة تقريباً`;
    }

    return (
      <main className="center-wrap night">
        <form action={loginPlayer} className="card narrow">
          <h1 className="brand-title">Komuy</h1>
          <p className="muted">أدخل اسم المستخدم وكلمة المرور اللذين أعطاك إياهما المسؤول لعرض سجلك</p>
          {error && <p className="notice notice-error">{error}</p>}
          <label className="field">
            <span>اسم المستخدم</span>
            <input name="username" required autoFocus dir="ltr" maxLength={64} autoComplete="username" />
          </label>
          <label className="field">
            <span>كلمة المرور</span>
            <input
              type="password"
              name="password"
              required
              dir="ltr"
              maxLength={128}
              autoComplete="current-password"
            />
          </label>
          <button type="submit" className="btn btn-primary">
            عرض سجلي
          </button>
        </form>
      </main>
    );
  }

  const rows = recordRows(player);
  const fixed = rows.filter((r) => !r.extra);
  const extra = rows.filter((r) => r.extra);

  return (
    <main className="center-wrap night">
      <article className="card dossier">
        <header className="dossier-head">
          <p className="muted" dir="ltr">
            @{player.username}
          </p>
          <h1>{player.name}</h1>
        </header>

        {rows.length === 0 && <p className="muted">سجلك فارغ حالياً.</p>}

        {fixed.length > 0 && (
          <dl className="record">
            {fixed.map((r) => (
              <div key={r.label} className="record-row">
                <dt>
                  <span aria-hidden="true">{r.icon}</span> {r.label}
                </dt>
                <dd>{r.value}</dd>
              </div>
            ))}
          </dl>
        )}

        {extra.length > 0 && (
          <>
            <h2 className="record-sub">معلومات إضافية</h2>
            <dl className="record">
              {extra.map((r, i) => (
                <div key={`${r.label}-${i}`} className="record-row">
                  <dt>{r.label}</dt>
                  <dd>{r.value}</dd>
                </div>
              ))}
            </dl>
          </>
        )}

        <form action={logoutPlayer}>
          <button type="submit" className="btn btn-ghost">
            تسجيل الخروج
          </button>
        </form>
      </article>
    </main>
  );
}
