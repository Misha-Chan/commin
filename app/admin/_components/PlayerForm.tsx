"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { savePlayer } from "../actions";

type Initial = {
  id: number;
  username: string;
  name: string;
  age: string;
  country: string;
  wealth: string;
  family: string;
  extraFields: { label: string; value: string }[];
};

type Row = { key: number; label: string; value: string };

// بدون أحرف متشابهة (0/O, 1/l/I) لتسهيل إعطاء كلمة المرور للاعب
const ALPHABET = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789";

function generatePassword(length = 10) {
  const bytes = new Uint32Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join("");
}

export default function PlayerForm({ initial }: { initial?: Initial }) {
  const router = useRouter();
  const isEdit = Boolean(initial);
  const nextKey = useRef(0);
  const [rows, setRows] = useState<Row[]>(() =>
    (initial?.extraFields ?? []).map((f) => ({ key: nextKey.current++, ...f }))
  );
  const [password, setPassword] = useState("");
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function updateRow(key: number, patch: Partial<Row>) {
    setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  }

  async function copyPassword() {
    if (!password) return;
    try {
      await navigator.clipboard.writeText(password);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* ignore */
    }
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const res = await savePlayer(new FormData(e.currentTarget));
      if (!res.ok) {
        setError(res.error);
        setSaving(false);
        return;
      }
      router.push("/admin");
      router.refresh();
    } catch {
      setError("تعذّر الاتصال بالخادم، حاول مرة أخرى");
      setSaving(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="player-form">
      {initial && <input type="hidden" name="id" value={initial.id} />}

      <fieldset>
        <legend>بيانات الدخول (تعطيها للاعب بنفسك)</legend>
        <div className="grid-2">
          <label className="field">
            <span>اسم المستخدم</span>
            <input
              name="username"
              defaultValue={initial?.username}
              required
              minLength={3}
              maxLength={32}
              dir="ltr"
              autoComplete="off"
            />
          </label>
          <label className="field">
            <span>كلمة المرور</span>
            <div className="input-row">
              <input
                name="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required={!isEdit}
                minLength={6}
                maxLength={64}
                dir="ltr"
                autoComplete="off"
                placeholder={isEdit ? "اتركه فارغاً للإبقاء على كلمة المرور الحالية" : ""}
              />
              <button type="button" className="btn btn-small" onClick={() => setPassword(generatePassword())}>
                توليد
              </button>
              <button type="button" className="btn btn-small" onClick={copyPassword} disabled={!password}>
                {copied ? "تم النسخ" : "نسخ"}
              </button>
            </div>
          </label>
        </div>
        {isEdit && (
          <p className="hint">تغيير كلمة المرور يُسجّل خروج اللاعب من البوت والموقع تلقائياً.</p>
        )}
      </fieldset>

      <fieldset>
        <legend>السجل الذي سيظهر للاعب</legend>
        <div className="grid-2">
          <label className="field">
            <span>الاسم</span>
            <input name="name" defaultValue={initial?.name} required maxLength={80} />
          </label>
          <label className="field">
            <span>العمر</span>
            <input name="age" defaultValue={initial?.age} maxLength={20} />
          </label>
          <label className="field">
            <span>الدولة</span>
            <input name="country" defaultValue={initial?.country} maxLength={60} />
          </label>
          <label className="field">
            <span>الثروة الشخصية</span>
            <input name="wealth" defaultValue={initial?.wealth} maxLength={100} />
          </label>
          <label className="field field-wide">
            <span>العائلة</span>
            <input name="family" defaultValue={initial?.family} maxLength={200} />
          </label>
        </div>

        {rows.length > 0 && (
          <div className="extra-list">
            {rows.map((r) => (
              <div className="extra-row" key={r.key}>
                <input
                  name="extraLabel"
                  value={r.label}
                  onChange={(e) => updateRow(r.key, { label: e.target.value })}
                  placeholder="اسم الحقل"
                  maxLength={60}
                  aria-label="اسم الحقل"
                />
                <input
                  name="extraValue"
                  value={r.value}
                  onChange={(e) => updateRow(r.key, { value: e.target.value })}
                  placeholder="القيمة"
                  maxLength={500}
                  aria-label="قيمة الحقل"
                />
                <button
                  type="button"
                  className="btn btn-small btn-danger"
                  onClick={() => setRows((rs) => rs.filter((x) => x.key !== r.key))}
                >
                  حذف
                </button>
              </div>
            ))}
          </div>
        )}

        <button
          type="button"
          className="btn btn-dashed"
          disabled={rows.length >= 30}
          onClick={() => setRows((rs) => [...rs, { key: nextKey.current++, label: "", value: "" }])}
        >
          + إضافة حقل جديد
        </button>
      </fieldset>

      {error && <p className="notice notice-error">{error}</p>}

      <div className="form-actions">
        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? "جارٍ الحفظ..." : "حفظ"}
        </button>
        <Link href="/admin" className="btn btn-ghost">
          إلغاء
        </Link>
      </div>
    </form>
  );
}
