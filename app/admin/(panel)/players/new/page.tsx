import { requireAdminPage } from "@/lib/adminGuard";
import PlayerForm from "../../../_components/PlayerForm";

export default async function NewPlayerPage() {
  await requireAdminPage();
  return (
    <section className="panel">
      <div className="panel-head">
        <h2>إنشاء حساب مستخدم جديد</h2>
      </div>
      <PlayerForm />
    </section>
  );
}
