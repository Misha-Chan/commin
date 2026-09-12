# 🦊🌸 Mokuchiro Bot Service

بوت تيليجرام لخدمة مجتمع Mokuchiro: محفظة عملة الميكو 🌸، الفعاليات الجديدة،
والإبلاغ عن المشاكل — مع لوحة إدارة على نفس الدومين (`/admin`).
مبني بـ Next.js، ومُستضاف على Vercel، وقاعدة بياناته Turso (SQLite).

## المكونات

- **البوت**: `lib/telegram.ts` (مكتبة [grammY](https://grammy.dev)) — يستقبل
  التحديثات عبر Webhook في `app/api/telegram/route.ts`.
- **تسجيل الحساب**: صفحة Telegram Web App في `app/webapp/register` +
  نقطة استقبال `app/api/webapp/register/route.ts` التي تتحقق من توقيع
  تيليجرام (initData) وتشفّر كلمة المرور (bcrypt) قبل حفظها.
- **قاعدة البيانات**: Turso عبر Drizzle ORM — الجداول معرّفة في `db/schema.ts`
  (`users`, `miko_transactions`, `problems`, `events`, `pending_actions`).
- **لوحة الإدارة**: `app/admin/*` — محمية بكلمة مرور، لإدارة المستخدمين
  ومحفظاتهم، الفعاليات، وبلاغات المشاكل.

## 1. المتطلبات الأولية

- Node.js 18 أو أحدث
- حساب [GitHub](https://github.com)
- حساب [Vercel](https://vercel.com)
- حساب [Turso](https://turso.tech) + تثبيت [Turso CLI](https://docs.turso.tech/cli/installation)
- توكن بوت تيليجرام من [@BotFather](https://t.me/BotFather) (أمر `/newbot`)

## 2. إنشاء قاعدة بيانات Turso

```bash
turso auth login
turso db create mokuchiro-bot
turso db show mokuchiro-bot --url
turso db tokens create mokuchiro-bot
```

احتفظ بالـ URL والتوكن الناتجين، ستحتاجهما في الخطوة التالية.

## 3. الإعداد المحلي

```bash
git clone <رابط-المستودع-بعد-رفعه-إلى-GitHub>
cd mokuchiro-bot
npm install
cp .env.example .env
```

عبّئ ملف `.env`:

```
TELEGRAM_BOT_TOKEN=xxxxxxxxx:xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
APP_URL=https://your-project.vercel.app
TURSO_DATABASE_URL=libsql://mokuchiro-bot-xxxx.turso.io
TURSO_AUTH_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
ADMIN_PASSWORD=اختر-كلمة-مرور-قوية
SESSION_SECRET=  # ولّدها بأمر: openssl rand -hex 32
```

> ⚠️ `APP_URL` لازم يكون رابط النشر النهائي على Vercel (بعد أول Deploy)، لأنه
> يُستخدم لبناء رابط صفحة التسجيل (Web App) وروابط صور فئات الميكو.

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
git commit -m "Mokuchiro Bot Service"
git branch -M main
git remote add origin <رابط مستودعك على GitHub>
git push -u origin main
```

## 5. النشر على Vercel

1. من لوحة Vercel: **Add New Project** → اختر المستودع من GitHub.
2. أضف متغيرات البيئة نفسها الموجودة في `.env` (من إعدادات المشروع
   **Settings → Environment Variables**):
   - `TELEGRAM_BOT_TOKEN`
   - `APP_URL` (ضع الرابط الحقيقي بعد أول نشر، ثم أعد النشر — Redeploy)
   - `TURSO_DATABASE_URL`
   - `TURSO_AUTH_TOKEN`
   - `ADMIN_PASSWORD`
   - `SESSION_SECRET`
3. اضغط **Deploy**. بعد انتهاء النشر ستحصل على رابط مثل:
   `https://your-project.vercel.app`
4. ارجع لخطوة `APP_URL` وحدّثها بالرابط الحقيقي، ثم اعمل **Redeploy**.

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

- تعديل اسم حساب أي مستخدم أو حذفه.
- تحويل (أو خصم) عملة الميكو لأي مستخدم — أدخل رقماً سالباً للخصم.
- إضافة/حذف الفعاليات الجديدة.
- متابعة بلاغات المشاكل وتحديث حالتها (جديد / قيد المراجعة / تم الحل).

## 8. تجربة البوت

افتح محادثة مع بوتك في تيليجرام واكتب `/start`:

1. **أول مرة**: يسجّلك البوت بحالة "غير مكتمل" ويعطيك زر
   "إكمال تسجيل الحساب ↑" يفتح صفحة داخل تيليجرام (Web App) لإدخال
   اسم مستخدم وكلمة مرور. كلمة المرور تُشفّر (bcrypt) قبل حفظها في Turso.
   بعد الحفظ يصلك تأكيد فوري من البوت "تم التسجيل بنجاح ✅".
2. **اكتب `/start` مجدداً**: تظهر القائمة الرئيسية بثلاثة أزرار:
   - **💰 محفظتي**: يعرض رصيدك، وإذا كان أكبر من صفر يرسل صور فئات
     عملة الميكو (100/50/10/5/1 ཉཽུ) حسب المبلغ الفعلي (طريقة توزيع
     الفلوس الحقيقية — أكبر فئة ممكنة أولاً).
   - **🎉 الفعاليات الجديدة**: يعرض الفعاليات المُضافة من لوحة الإدارة.
   - **⚠️ الإبلاغ عن مشكلة**: يطلب منك كتابة المشكلة كنص حر، وترسل
     إشعاراً بلوحة الإدارة.

## بنية المشروع

```
app/
  api/telegram/route.ts          # نقطة استقبال Webhook للبوت
  api/webapp/register/route.ts   # نقطة استقبال تسجيل الحساب من Web App
  webapp/register/page.tsx       # واجهة تسجيل الحساب (داخل تيليجرام)
  admin/                         # لوحة الإدارة (محمية بكلمة مرور)
  page.tsx                       # صفحة عامة بسيطة
db/
  schema.ts       # جداول: users, miko_transactions, problems, events...
  client.ts       # اتصال Drizzle + Turso
lib/
  telegram.ts      # منطق البوت الكامل
  telegramAuth.ts  # التحقق من توقيع Telegram Web App (initData)
  miko.ts          # منطق فئات عملة الميكو وتوزيعها
  actions.ts       # Server Actions للوحة الإدارة
  auth.ts          # توقيع/تحقق جلسة تسجيل دخول الإدارة
middleware.ts       # حماية مسارات /admin
public/miko/        # صور فئات عملة الميكو (100.png, 50.png, 10.png, 5.png, 1.png)
```

## أفكار للتوسعة لاحقاً

- إشعار المسؤول تلقائياً في تيليجرام عند وصول بلاغ جديد.
- سجل كامل لتحويلات الميكو يظهر بلوحة الإدارة (الجدول `miko_transactions`
  موجود بالفعل بقاعدة البيانات، ينقصه فقط عرضه بواجهة الإدارة).
- دعم عدة مسؤولين بحسابات منفصلة بدل كلمة مرور واحدة.
- صور/تفاصيل أغنى للفعاليات (مثل صورة غلاف لكل فعالية).
