import type { PlayerInput } from "./players";

export type ParsedPlayerForm =
  | { ok: true; id: number | null; input: PlayerInput; password: string | null }
  | { ok: false; error: string };

const USERNAME_RE = /^[A-Za-z0-9_\u0600-\u06FF]+$/;

function text(fd: FormData, key: string) {
  return String(fd.get(key) ?? "").trim();
}

function optional(value: string, max: number, label: string): string | null | { error: string } {
  if (!value) return null;
  if (value.length > max) return { error: `${label} طويل جداً (الحد ${max} حرفاً)` };
  return value;
}

export function parsePlayerForm(fd: FormData): ParsedPlayerForm {
  const idRaw = text(fd, "id");
  const id = idRaw ? Number(idRaw) : null;
  if (idRaw && (!Number.isInteger(id) || (id as number) <= 0)) {
    return { ok: false, error: "معرّف الحساب غير صالح" };
  }

  const username = text(fd, "username");
  if (username.length < 3 || username.length > 32) {
    return { ok: false, error: "اسم المستخدم يجب أن يكون بين 3 و32 حرفاً" };
  }
  if (!USERNAME_RE.test(username)) {
    return { ok: false, error: "اسم المستخدم: أحرف وأرقام وشرطة سفلية فقط (بدون مسافات)" };
  }

  const name = text(fd, "name");
  if (!name) return { ok: false, error: "الاسم مطلوب" };
  if (name.length > 80) return { ok: false, error: "الاسم طويل جداً (الحد 80 حرفاً)" };

  const password = String(fd.get("password") ?? "");
  let finalPassword: string | null = null;
  if (password) {
    if (password.length < 6 || password.length > 64) {
      return { ok: false, error: "كلمة المرور يجب أن تكون بين 6 و64 حرفاً" };
    }
    if (/\s/.test(password)) {
      return { ok: false, error: "كلمة المرور لا يجب أن تحتوي مسافات" };
    }
    finalPassword = password;
  } else if (id === null) {
    return { ok: false, error: "كلمة المرور مطلوبة للحساب الجديد" };
  }

  const fixed: Record<"age" | "country" | "wealth" | "family", string | null> = {
    age: null,
    country: null,
    wealth: null,
    family: null,
  };
  const limits: [keyof typeof fixed, number, string][] = [
    ["age", 20, "العمر"],
    ["country", 60, "الدولة"],
    ["wealth", 100, "الثروة الشخصية"],
    ["family", 200, "العائلة"],
  ];
  for (const [key, max, label] of limits) {
    const r = optional(text(fd, key), max, label);
    if (r && typeof r === "object") return { ok: false, error: r.error };
    fixed[key] = r as string | null;
  }

  const labels = fd.getAll("extraLabel").map((v) => String(v).trim());
  const values = fd.getAll("extraValue").map((v) => String(v).trim());
  const extraFields: { label: string; value: string }[] = [];
  for (let i = 0; i < labels.length; i++) {
    const label = labels[i];
    const value = values[i] ?? "";
    if (!label && !value) continue;
    if (!label) return { ok: false, error: "أحد الحقول الإضافية بدون اسم" };
    if (label.length > 60) return { ok: false, error: "اسم الحقل الإضافي طويل (الحد 60 حرفاً)" };
    if (value.length > 500) return { ok: false, error: "قيمة الحقل الإضافي طويلة (الحد 500 حرف)" };
    extraFields.push({ label, value });
  }
  if (extraFields.length > 30) return { ok: false, error: "الحد الأقصى 30 حقلاً إضافياً" };

  return {
    ok: true,
    id,
    password: finalPassword,
    input: { username, name, ...fixed, extraFields },
  };
}
