"use client";

import { useState } from "react";
import Script from "next/script";

declare global {
  interface Window {
    Telegram?: {
      WebApp?: {
        ready: () => void;
        expand: () => void;
        close: () => void;
        initData: string;
        themeParams?: Record<string, string>;
      };
    };
  }
}

export default function RegisterWebApp() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const webApp = window.Telegram?.WebApp;
    const initData = webApp?.initData ?? "";

    if (!initData) {
      setError("افتح هذا النموذج من داخل بوت Mokuchiro على تيليجرام.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/webapp/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ initData, username, password }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "حدث خطأ، حاول مرة أخرى");
        setLoading(false);
        return;
      }

      setSuccess(true);
      setLoading(false);
      setTimeout(() => {
        webApp?.close();
      }, 1200);
    } catch {
      setError("تعذّر الاتصال بالخادم، تحقق من اتصالك وحاول مرة أخرى");
      setLoading(false);
    }
  }

  return (
    <>
      <Script
        src="https://telegram.org/js/telegram-web-app.js"
        strategy="beforeInteractive"
        onReady={() => {
          window.Telegram?.WebApp?.ready();
          window.Telegram?.WebApp?.expand();
        }}
      />
      <main className="webapp-wrap">
        <div className="webapp-card">
          <h1>🦊🌸 Mokuchiro</h1>
          <p>أكمل تسجيل حسابك لتفعيل محفظة الميكو الخاصة بك</p>

          {success ? (
            <p className="webapp-success">تم التسجيل بنجاح ✅ ارجع للبوت الآن</p>
          ) : (
            <form onSubmit={handleSubmit} className="webapp-form">
              <label>
                اسم المستخدم
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  minLength={3}
                  maxLength={32}
                  required
                  autoFocus
                  placeholder="مثال: mokuchiro_fan"
                />
              </label>
              <label>
                كلمة المرور
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  minLength={6}
                  required
                  placeholder="6 أحرف على الأقل"
                />
              </label>
              {error && <p className="webapp-error">{error}</p>}
              <button type="submit" disabled={loading}>
                {loading ? "جارٍ الحفظ..." : "تم"}
              </button>
            </form>
          )}
        </div>
      </main>
    </>
  );
}
