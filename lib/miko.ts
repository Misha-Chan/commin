// منطق عملة الميكو 🌸 (فئات، رمز العملة، وتفكيك الرصيد لصور الفئات)

export const MIKO_SYMBOL = "ཉཽུ";

// الفئات المتوفرة من الأكبر للأصغر (يجب أن تبقى مرتّبة تنازلياً)
export const MIKO_DENOMINATIONS = [100, 50, 10, 5, 1] as const;

export function formatMiko(amount: number) {
  return `${amount}${MIKO_SYMBOL}`;
}

/**
 * يفكك رصيداً معيناً إلى فئات (بطريقة "جشعة" تماماً كالفلوس الحقيقية):
 * يبدأ بأكبر فئة ممكنة ثم يطرح ويكرر لحد ما يوصل الباقي لصفر.
 * مثال: 125 -> [{value:100,count:1},{value:10,count:2},{value:5,count:1}]
 */
export function breakdownMikoBalance(balance: number) {
  let remaining = Math.max(0, Math.trunc(balance));
  const breakdown: { value: number; count: number }[] = [];

  for (const value of MIKO_DENOMINATIONS) {
    const count = Math.floor(remaining / value);
    if (count > 0) {
      breakdown.push({ value, count });
      remaining -= count * value;
    }
  }

  return breakdown;
}

/** يحوّل التفكيك إلى قائمة مسطّحة من قيم الفئات (فئة واحدة لكل ورقة) */
export function flattenMikoBreakdown(balance: number) {
  const flat: number[] = [];
  for (const { value, count } of breakdownMikoBalance(balance)) {
    for (let i = 0; i < count; i++) flat.push(value);
  }
  return flat;
}

export function mikoDenominationImageUrl(appUrl: string, value: number) {
  return `${appUrl.replace(/\/$/, "")}/miko/${value}.png`;
}
