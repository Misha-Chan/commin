import {
  listFaqs,
  listRequests,
  listEvents,
  addFaq,
  deleteFaq,
  addEvent,
  deleteEvent,
  updateRequestStatus,
  countBookings,
} from "@/lib/actions";

export default async function AdminDashboard() {
  const [faqList, requestList, eventList] = await Promise.all([
    listFaqs(),
    listRequests(),
    listEvents(),
  ]);
  const bookingCounts = await Promise.all(
    eventList.map((e) => countBookings(e.id))
  );

  async function addFaqAction(formData: FormData) {
    "use server";
    await addFaq(formData);
  }
  async function deleteFaqAction(formData: FormData) {
    "use server";
    await deleteFaq(Number(formData.get("id")));
  }
  async function addEventAction(formData: FormData) {
    "use server";
    await addEvent(formData);
  }
  async function deleteEventAction(formData: FormData) {
    "use server";
    await deleteEvent(Number(formData.get("id")));
  }
  async function updateStatusAction(formData: FormData) {
    "use server";
    await updateRequestStatus(Number(formData.get("id")), String(formData.get("status")));
  }

  return (
    <div className="dashboard">
      {/* الطلبات والشكاوى */}
      <section className="panel" id="requests">
        <h2>
          الطلبات والشكاوى <span className="count">{requestList.length}</span>
        </h2>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>النوع</th>
                <th>الرسالة</th>
                <th>المستخدم</th>
                <th>الحالة</th>
                <th>التاريخ</th>
              </tr>
            </thead>
            <tbody>
              {requestList.map((r) => (
                <tr key={r.id}>
                  <td>
                    <span className={`tag ${r.type}`}>
                      {r.type === "complaint" ? "شكوى" : "طلب"}
                    </span>
                  </td>
                  <td>{r.message}</td>
                  <td>{r.fullName || r.username || r.telegramUserId}</td>
                  <td>
                    <form action={updateStatusAction} className="status-form">
                      <input type="hidden" name="id" value={r.id} />
                      <select name="status" defaultValue={r.status}>
                        <option value="جديد">جديد</option>
                        <option value="قيد المعالجة">قيد المعالجة</option>
                        <option value="مكتمل">مكتمل</option>
                      </select>
                      <button type="submit">تحديث</button>
                    </form>
                  </td>
                  <td>{r.createdAt}</td>
                </tr>
              ))}
              {requestList.length === 0 && (
                <tr>
                  <td colSpan={5} className="empty">
                    لا توجد طلبات أو شكاوى بعد
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* الأسئلة الشائعة */}
      <section className="panel" id="faqs">
        <h2>
          الأسئلة الشائعة <span className="count">{faqList.length}</span>
        </h2>
        <form action={addFaqAction} className="stacked-form">
          <input type="text" name="question" placeholder="السؤال" required />
          <textarea name="answer" placeholder="الجواب" required rows={2} />
          <button type="submit">إضافة سؤال</button>
        </form>
        <ul className="list">
          {faqList.map((f) => (
            <li key={f.id}>
              <div>
                <strong>{f.question}</strong>
                <p>{f.answer}</p>
              </div>
              <form action={deleteFaqAction}>
                <input type="hidden" name="id" value={f.id} />
                <button type="submit" className="danger-btn">
                  حذف
                </button>
              </form>
            </li>
          ))}
          {faqList.length === 0 && <li className="empty">لا توجد أسئلة بعد</li>}
        </ul>
      </section>

      {/* الفعاليات */}
      <section className="panel" id="events">
        <h2>
          الفعاليات <span className="count">{eventList.length}</span>
        </h2>
        <form action={addEventAction} className="stacked-form">
          <input type="text" name="title" placeholder="عنوان الفعالية" required />
          <textarea name="description" placeholder="وصف مختصر" rows={2} />
          <div className="row">
            <input
              type="text"
              name="eventDate"
              placeholder="التاريخ (مثال: 2026-09-20 18:00)"
              required
            />
            <input type="text" name="location" placeholder="المكان" />
            <input type="number" name="capacity" placeholder="عدد المقاعد (اختياري)" />
          </div>
          <button type="submit">إضافة فعالية</button>
        </form>
        <ul className="list">
          {eventList.map((e, i) => (
            <li key={e.id}>
              <div>
                <strong>{e.title}</strong>
                <p>
                  {e.eventDate}
                  {e.location ? ` · ${e.location}` : ""}
                </p>
                <p className="muted">
                  {bookingCounts[i]} مسجّل{e.capacity ? ` من ${e.capacity}` : ""}
                </p>
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
