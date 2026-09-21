import { notFound } from "next/navigation";
import { requireAdminPage } from "@/lib/adminGuard";
import { getPlayerById } from "@/lib/players";
import PlayerForm from "../../../_components/PlayerForm";

export const dynamic = "force-dynamic";

export default async function EditPlayerPage({ params }: { params: { id: string } }) {
  await requireAdminPage();
  const id = Number(params.id);
  if (!Number.isInteger(id) || id <= 0) notFound();

  const player = await getPlayerById(id);
  if (!player) notFound();

  // لا نمرّر passwordHash للمتصفح أبداً
  return (
    <section className="panel">
      <div className="panel-head">
        <h2>تعديل حساب: {player.name}</h2>
      </div>
      <PlayerForm
        initial={{
          id: player.id,
          username: player.username,
          name: player.name,
          age: player.age ?? "",
          country: player.country ?? "",
          wealth: player.wealth ?? "",
          family: player.family ?? "",
          extraFields: player.extraFields,
        }}
      />
    </section>
  );
}
