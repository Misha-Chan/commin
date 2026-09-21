import { loginAdmin } from "../actions";

export const metadata = { title: "دخول الإدارة · Komuy", robots: { index: false, follow: false } };

export default function AdminLoginPage({ searchParams }: { searchParams: { error?: string } }) {
  return (
    <main className="center-wrap">
      <form action={loginAdmin} className="card narrow">
        <h1 className="brand-title">Komuy bot</h1>
        <p className="muted">أدخل كلمة مرور الإدارة للمتابعة</p>
        {searchParams.error && <p className="notice notice-error">{searchParams.error}</p>}
        <label className="field">
          <span>كلمة المرور</span>
          <input type="password" name="password" required autoFocus autoComplete="current-password" />
        </label>
        <button type="submit" className="btn btn-primary">
          دخول
        </button>
      </form>
    </main>
  );
}
