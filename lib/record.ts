import type { Player } from "./players";

export type RecordRow = { icon: string; label: string; value: string; extra: boolean };

/** صفوف السجل الظاهرة للاعب (الحقول الفارغة تُتجاهل) */
export function recordRows(p: Player): RecordRow[] {
  const fixed: [string, string, string | null][] = [
    ["👤", "الاسم", p.name],
    ["🎂", "العمر", p.age],
    ["🌍", "الدولة", p.country],
    ["💰", "الثروة الشخصية", p.wealth],
    ["👪", "العائلة", p.family],
  ];
  const rows: RecordRow[] = fixed
    .filter(([, , v]) => v && v.trim())
    .map(([icon, label, v]) => ({ icon, label, value: v as string, extra: false }));

  for (const f of p.extraFields) {
    if (f.label.trim() && f.value.trim()) {
      rows.push({ icon: "▫️", label: f.label, value: f.value, extra: true });
    }
  }
  return rows;
}

/** نص السجل لرسالة تيليجرام (نص عادي بدون parse_mode لتفادي أي حقن) */
export function formatRecordText(p: Player): string {
  const rows = recordRows(p);
  const lines = ["🦊 سجلك في Komuy", "━━━━━━━━━━━━━━"];
  if (rows.length === 0) {
    lines.push("السجل فارغ حالياً.");
  } else {
    for (const r of rows) lines.push(`${r.icon} ${r.label}: ${r.value}`);
  }
  return lines.join("\n");
}

/** تقسيم النص الطويل على حدود الأسطر (حد تيليجرام 4096 حرفاً) */
export function chunkText(text: string, max = 3800): string[] {
  if (text.length <= max) return [text];
  const chunks: string[] = [];
  let current = "";
  for (const line of text.split("\n")) {
    const piece = line.length > max ? line.slice(0, max) : line;
    if ((current + "\n" + piece).length > max && current) {
      chunks.push(current);
      current = piece;
    } else {
      current = current ? `${current}\n${piece}` : piece;
    }
  }
  if (current) chunks.push(current);
  return chunks;
}
