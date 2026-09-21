import Link from "next/link";
import { requireAdminPage } from "@/lib/adminGuard";
import { listPlayers } from "@/lib/players";
import { fetchBotStatus } from "@/lib/webhook";
import BotConnect from "../_components/BotConnect";
import DeleteButton from "../_components/DeleteButton";

export const dynamic = "force-dynamic";

function fmt(ts: number | null) {
  if (!ts) return "—";
  return new Date(ts * 1000).toISOString().slice(0, 16).replace("T", " ");
}

export default async function AdminDashboard() {
  await requireAdminPage();
  const [players, status] = await Promise.all([listPlayers(), fetchBotStatus()]);

  return (
    <>
      <section className="panel">
        <div className="panel-head">
          <h2>حالة البوت</h2>
        </div>
        {status.ok ? (
          <div className="status-grid">
            <p>
              البوت: <strong dir="ltr">@{status.username}</strong>
            </p>
            <p>
              الـ Webhook:{" "}
              {status.connected ? (
                <span className="pill pill-ok">مربوط بهذا الموقع</span>
              ) : (
                <span className="pill pill-warn">غير مربوط — اضغط «ربط البوت»</span>
              )}
            </p>
            <p>تحديثات معلّقة: {status.pending}</p>
            {status.lastError && <p className="notice notice-error">آخر خطأ من تيليجرام: {status.lastError}</p>}
          </div>
        ) : (
          <p className="notice notice-error">تعذّر الاتصال بتيليجرام: {status.error}</p>
        )}
        <BotConnect />
      </section>

      <section className="panel">
        <div className="panel-head">
          <h2>
            سجلات اللاعبين <span className="count">{players.length}</span>
          </h2>
          <Link href="/admin/players/new" className="btn btn-primary">
            + إنشاء حساب مستخدم جديد
          </Link>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>الاسم</th>
                <th>اسم المستخدم</th>
                <th>العمر</th>
                <th>الدولة</th>
                <th>الثروة الشخصية</th>
                <th>العائلة</th>
                <th>حقول إضافية</th>
                <th>آخر دخول (UTC)</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {players.map((p) => (
                <tr key={p.id}>
                  <td>{p.name}</td>
                  <td dir="ltr" className="mono">
                    {p.username}
                  </td>
                  <td>{p.age ?? "—"}</td>
                  <td>{p.country ?? "—"}</td>
                  <td>{p.wealth ?? "—"}</td>
                  <td>{p.family ?? "—"}</td>
                  <td>{p.extraFields.length || "—"}</td>
                  <td dir="ltr">{fmt(p.lastLoginAt)}</td>
                  <td className="actions">
                    <Link href={`/admin/players/${p.id}`} className="btn btn-small">
                      تعديل
                    </Link>
                    <DeleteButton id={p.id} name={p.name} />
                  </td>
                </tr>
              ))}
              {players.length === 0 && (
                <tr>
                  <td colSpan={9} className="empty">
                    لا توجد سجلات بعد. أنشئ أول حساب بالزر أعلاه.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
