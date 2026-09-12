import { redirect } from "next/navigation";
import { login } from "@/lib/actions";

export default function LoginPage({
  searchParams,
}: {
  searchParams: { error?: string };
}) {
  async function loginAction(formData: FormData) {
    "use server";
    const result = await login(formData);
    if (result?.error) {
      redirect(`/admin/login?error=${encodeURIComponent(result.error)}`);
    }
    redirect("/admin");
  }

  return (
    <main className="login-wrap">
      <form action={loginAction} className="login-card">
        <h1>🦊🌸 لوحة إدارة Mokuchiro</h1>
        <p>أدخل كلمة المرور للوصول إلى المستخدمين والمحفظة والفعاليات والبلاغات</p>
        {searchParams.error && <p className="error">{searchParams.error}</p>}
        <input
          type="password"
          name="password"
          placeholder="كلمة المرور"
          required
          autoFocus
        />
        <button type="submit">دخول</button>
      </form>
    </main>
  );
}
