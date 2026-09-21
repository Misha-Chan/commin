"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { deletePlayer } from "../actions";

export default function DeleteButton({ id, name }: { id: number; name: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function onClick() {
    if (!window.confirm(`حذف حساب «${name}» نهائياً؟ سيُسجَّل خروجه من البوت والموقع.`)) return;
    setBusy(true);
    try {
      await deletePlayer(id);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <button type="button" className="btn btn-small btn-danger" onClick={onClick} disabled={busy}>
      {busy ? "..." : "حذف"}
    </button>
  );
}
