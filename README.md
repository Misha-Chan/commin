# بوت خدمات المجتمع (Telegram + Vercel + Turso)

مشروع كامل: بوت تيليجرام لخدمات المجتمع (أسئلة شائعة، استقبال طلبات وشكاوى،
التسجيل في الفعاليات) + لوحة إدارة على الويب في نفس الدومين (`/admin`)
مبني بـ Next.js، ومُستضاف على Vercel، وقاعدة بياناته Turso (SQLite).

## المكونات

- **البوت**: `lib/telegram.ts` (مكتبة [grammY](https://grammy.dev)) — يستقبل
  التحديثات عبر Webhook في `app/api/telegram/route.ts`.
- **قاعدة البيانات**: Turso عبر Drizzle ORM — الجداول معرّفة في `db/schema.ts`.
- **لوحة الإدارة**: `app/admin/*` — محمية بكلمة مرور، لإدارة الأسئلة الشائعة
  ومراجعة الطلبات/الشكاوى وإدارة الفعاليات.

## 1. المتطلبات الأولية

- Node.js 18 أو أحدث
- حساب [GitHub](https://github.com)
- حساب [Vercel](https://vercel.com)
- حساب [Turso](https://turso.tech) + تثبيت [Turso CLI](https://docs.turso.tech/cli/installation)
- توكن بوت تيليجرام من [@BotFather](https://t.me/BotFather) (أمر `/newbot`)

## 2. إنشاء قاعدة بيانات Turso

```bash
turso auth login
turso db create community-bot
turso db show community-bot --url
turso db tokens create community-bot
```

احتفظ بالـ URL والتوكن الناتجين، ستحتاجهما في الخطوة التالية.

## 3. الإعداد المحلي

```bash
git clone <رابط-المستودع-بعد-رفعه-إلى-GitHub>
cd community-bot
npm install
cp .env.example .env
```

عبّئ ملف `.env`:

```
TELEGRAM_BOT_TOKEN=xxxxxxxxx:xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TURSO_DATABASE_URL=libsql://community-bot-xxxx.turso.io
TURSO_AUTH_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
ADMIN_PASSWORD=اختر-كلمة-مرور-قوية
SESSION_SECRET=  # ولّدها بأمر: openssl rand -hex 32
```

بعد ذلك أنشئ الجداول في Turso:

```bash
npm run db:push
```

جرّب محلياً:

```bash
npm run dev
```

## 4. رفع المشروع على GitHub

```bash
git init
git add .
git commit -m "بوت خدمات المجتمع"
git branch -M main
git remote add origin <رابط مستودعك على GitHub>
git push -u origin main
```

## 5. النشر على Vercel

1. من لوحة Vercel: **Add New Project** → اختر المستودع من GitHub.
2. أضف متغيرات البيئة نفسها الموجودة في `.env` (من إعدادات المشروع
   **Settings → Environment Variables**):
   - `TELEGRAM_BOT_TOKEN`
   - `TURSO_DATABASE_URL`
   - `TURSO_AUTH_TOKEN`
   - `ADMIN_PASSWORD`
   - `SESSION_SECRET`
3. اضغط **Deploy**. بعد انتهاء النشر ستحصل على رابط مثل:
   `https://your-project.vercel.app`

## 6. ربط الـ Webhook بتيليجرام

بعد النشر، سجّل رابط الـ Webhook لدى تيليجرام (مرة واحدة فقط):

```bash
curl -F "url=https://your-project.vercel.app/api/telegram" \
  https://api.telegram.org/bot<TELEGRAM_BOT_TOKEN>/setWebhook
```

يمكنك التأكد من نجاح الربط عبر:

```bash
curl https://api.telegram.org/bot<TELEGRAM_BOT_TOKEN>/getWebhookInfo
```

## 7. استخدام لوحة الإدارة

افتح `https://your-project.vercel.app/admin` وسجّل الدخول بكلمة المرور
(`ADMIN_PASSWORD`). من هناك تقدر:

- تضيف/تحذف أسئلة شائعة يجاوب عليها البوت تلقائياً.
- تراجع الطلبات والشكاوى الواردة من الأعضاء وتحدّث حالتها.
- تضيف فعاليات جديدة وتتابع عدد المسجّلين فيها.

## 8. تجربة البوت

افتح محادثة مع بوتك في تيليجرام واكتب `/start`. ستظهر القائمة الرئيسية:
الأسئلة الشائعة، تقديم طلب أو شكوى، والفعاليات القادمة.

## بنية المشروع

```
app/
  api/telegram/route.ts   # نقطة استقبال Webhook
  admin/                  # لوحة الإدارة (محمية بكلمة مرور)
  page.tsx                # صفحة عامة بسيطة
db/
  schema.ts               # جداول: faqs, requests, events, bookings...
  client.ts                # اتصال Drizzle + Turso
lib/
  telegram.ts             # منطق البوت الكامل
  actions.ts              # Server Actions للوحة الإدارة
  auth.ts                 # توقيع/تحقق جلسة تسجيل الدخول
middleware.ts             # حماية مسارات /admin
```

## أفكار للتوسعة لاحقاً

- إرسال تذكير تلقائي قبل موعد الفعالية (عبر Vercel Cron + رسالة تيليجرام).
- دعم عدة مسؤولين بحسابات منفصلة بدل كلمة مرور واحدة.
- تصنيفات/وسوم للأسئلة الشائعة عند تزايد عددها.
- إشعار المسؤول تلقائياً في تيليجرام عند وصول شكوى جديدة.
