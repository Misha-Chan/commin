"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { connectBotAction } from "../actions";

export default function BotConnect() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [messages, setMessages] = useState<string[]>([]);

  async function onClick() {
    setBusy(true);
    setMessages([]);
    try {
      const res = await connectBotAction();
      setMessages(res.messages);
      router.refresh();
    } catch {
      setMessages(["❌ تعذّر تنفيذ الطلب"]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="bot-connect">
      <button type="button" className="btn btn-primary" onClick={onClick} disabled={busy}>
        {busy ? "جارٍ الربط..." : "ربط البوت وتحديثه"}
      </button>
      <p className="hint">اضغطه بعد أول نشر أو إذا توقف البوت عن الرد. يضبط الـ Webhook والاسم والأوامر.</p>
      {messages.length > 0 && (
        <ul className="messages">
          {messages.map((m, i) => (
            <li key={i}>{m}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
