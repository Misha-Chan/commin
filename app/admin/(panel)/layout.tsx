import Link from "next/link";
import { requireAdminPage } from "@/lib/adminGuard";
import { logoutAdmin } from "../actions";

export const metadata = { title: "لوحة الإدارة · Komuy", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  await requireAdminPage();
  return (
    <div className="shell">
      <header className="topbar">
        <Link href="/admin" className="brand-title">
          Komuy bot <span className="brand-sub">لوحة الإدارة</span>
        </Link>
        <form action={logoutAdmin}>
          <button type="submit" className="btn btn-ghost">
            تسجيل الخروج
          </button>
        </form>
      </header>
      <main className="content">{children}</main>
    </div>
  );
}
