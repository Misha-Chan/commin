import {
  listUsers,
  updateUsername,
  deleteUser,
  transferMiko,
  listRecentTransactions,
  listEvents,
  addEvent,
  deleteEvent,
  listProblems,
  updateProblemStatus,
} from "@/lib/actions";
import { formatMiko } from "@/lib/miko";

export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  const [userList, eventList, problemList, transactionList] = await Promise.all([
    listUsers(),
    listEvents(),
    listProblems(),
    listRecentTransactions(15),
  ]);

  const newProblemsCount = problemList.filter((p) => p.status === "جديد").length;

  async function updateUsernameAction(formData: FormData) {
    "use server";
    await updateUsername(String(formData.get("telegramId")), String(formData.get("username")));
  }
  async function deleteUserAction(formData: FormData) {
    "use server";
    await deleteUser(String(formData.get("telegramId")));
  }
  async function transferMikoAction(formData: FormData) {
    "use server";
    await transferMiko(
      String(formData.get("telegramId")),
      Number(formData.get("amount")),
      "تحويل من الإدارة"
    );
  }
  async function addEventAction(formData: FormData) {
    "use server";
    await addEvent(formData);
  }
  async function deleteEventAction(formData: FormData) {
    "use server";
    await deleteEvent(Number(formData.get("id")));
  }
  async function updateProblemStatusAction(formData: FormData) {
    "use server";
    await updateProblemStatus(Number(formData.get("id")), String(formData.get("status")));
  }

  return (
    <div className="dashboard">
      {/* المستخدمون والمحفظة */}
      <section className="panel" id="users">
        <h2>
          المستخدمون <span className="count">{userList.length}</span>
        </h2>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>اسم الحساب</th>
                <th>تيليجرام</th>
                <th>الرصيد</th>
                <th>الحالة</th>
                <th>تعديل الاسم</th>
                <th>تحويل ميكو</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {userList.map((u) => (
                <tr key={u.telegramId}>
                  <td>{u.accountUsername ?? "—"}</td>
                  <td>
                    {u.telegramUsername ? `@${u.telegramUsername}` : u.fullName || u.telegramId}
                    <br />
                    <span className="muted-id">#{u.telegramId}</span>
                  </td>
                  <td className="balance-cell">{formatMiko(u.mikoBalance)}</td>
                  <td>
                    <span className={`tag ${u.status === "complete" ? "request" : "complaint"}`}>
                      {u.status === "complete" ? "مكتمل" : "غير مكتمل"}
                    </span>
                  </td>
                  <td>
                    <form action={updateUsernameAction} className="inline-form">
                      <input type="hidden" name="telegramId" value={u.telegramId} />
                      <input
                        type="text"
                        name="username"
                        defaultValue={u.accountUsername ?? ""}
                        placeholder="اسم جديد"
                      />
                      <button type="submit">حفظ</button>
                    </form>
                  </td>
                  <td>
                    <form action={transferMikoAction} className="inline-form">
                      <input type="hidden" name="telegramId" value={u.telegramId} />
                      <input type="number" name="amount" placeholder="±الكمية" required />
                      <button type="submit">تحويل</button>
                    </form>
                  </td>
                  <td>
                    <form action={deleteUserAction}>
                      <input type="hidden" name="telegramId" value={u.telegramId} />
                      <button type="submit" className="danger-btn">
                        حذف
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
              {userList.length === 0 && (
                <tr>
                  <td colSpan={7} className="empty">
                    لا يوجد مستخدمون بعد
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* آخر التحويلات (يدوية أو من اللعبة) */}
      <section className="panel" id="transactions">
        <h2>
          آخر التحويلات <span className="count">{transactionList.length}</span>
        </h2>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>المستخدم</th>
                <th>الكمية</th>
                <th>السبب</th>
                <th>التاريخ</th>
              </tr>
            </thead>
            <tbody>
              {transactionList.map((t) => {
                const owner = userList.find((u) => u.telegramId === t.telegramId);
                return (
                  <tr key={t.id}>
                    <td>{owner?.accountUsername ?? t.telegramId}</td>
                    <td className={t.amount >= 0 ? "amount-positive" : "amount-negative"}>
                      {t.amount >= 0 ? "+" : ""}
                      {formatMiko(t.amount)}
                    </td>
                    <td>{t.reason ?? "—"}</td>
                    <td>{t.createdAt}</td>
                  </tr>
                );
              })}
              {transactionList.length === 0 && (
                <tr>
                  <td colSpan={4} className="empty">
                    لا توجد تحويلات بعد
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* بلاغات المشاكل */}
      <section className="panel" id="problems">
        <h2>
          بلاغات المشاكل{" "}
          <span className="count">{problemList.length}</span>
          {newProblemsCount > 0 && (
            <span className="count count-alert">{newProblemsCount} جديد</span>
          )}
        </h2>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>المستخدم</th>
                <th>الرسالة</th>
                <th>الحالة</th>
                <th>التاريخ</th>
              </tr>
            </thead>
            <tbody>
              {problemList.map((p) => (
                <tr key={p.id}>
                  <td>{p.accountUsername ?? p.telegramId}</td>
                  <td>{p.message}</td>
                  <td>
                    <form action={updateProblemStatusAction} className="status-form">
                      <input type="hidden" name="id" value={p.id} />
                      <select name="status" defaultValue={p.status}>
                        <option value="جديد">جديد</option>
                        <option value="قيد المراجعة">قيد المراجعة</option>
                        <option value="تم الحل">تم الحل</option>
                      </select>
                      <button type="submit">تحديث</button>
                    </form>
                  </td>
                  <td>{p.createdAt}</td>
                </tr>
              ))}
              {problemList.length === 0 && (
                <tr>
                  <td colSpan={4} className="empty">
                    لا توجد بلاغات بعد
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* الفعاليات */}
      <section className="panel" id="events">
        <h2>
          الفعاليات <span className="count">{eventList.length}</span>
        </h2>
        <form action={addEventAction} className="stacked-form">
          <input type="text" name="title" placeholder="عنوان الفعالية" required />
          <textarea name="description" placeholder="وصف الفعالية" rows={2} />
          <input type="text" name="eventDate" placeholder="التاريخ (اختياري، مثال: 2026-09-20 18:00)" />
          <button type="submit">إضافة فعالية</button>
        </form>
        <ul className="list">
          {eventList.map((e) => (
            <li key={e.id}>
              <div>
                <strong>{e.title}</strong>
                {e.description && <p>{e.description}</p>}
                {e.eventDate && <p className="muted">🗓 {e.eventDate}</p>}
              </div>
              <form action={deleteEventAction}>
                <input type="hidden" name="id" value={e.id} />
                <button type="submit" className="danger-btn">
                  حذف
                </button>
              </form>
            </li>
          ))}
          {eventList.length === 0 && <li className="empty">لا توجد فعاليات بعد</li>}
        </ul>
      </section>
    </div>
  );
}
