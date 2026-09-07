import { redirect } from "next/navigation";
import { logout } from "@/lib/actions";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  async function logoutAction() {
    "use server";
    await logout();
    redirect("/admin/login");
  }

  return (
    <div className="admin-shell">
      <header className="admin-header">
        <span className="brand">لوحة الخدمات المجتمعية</span>
        <form action={logoutAction}>
          <button type="submit" className="ghost-btn">
            تسجيل الخروج
          </button>
        </form>
      </header>
      <main className="admin-main">{children}</main>
    </div>
  );
}
