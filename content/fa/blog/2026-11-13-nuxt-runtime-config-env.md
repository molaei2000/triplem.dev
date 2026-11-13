---
title: "نکتهٔ حرفه‌ای Nuxt: runtimeConfig فقط برای کلیدهای تعریف‌شده متغیر محیطی می‌خواند و سرور build‌شده هرگز .env را نمی‌خواند"
description: "سه اشتباه runtimeConfig که فقط در production دیده می‌شوند: کلیدهای تعریف‌نشده، مقدار پیش‌فرض process.env که موقع build ثابت می‌شود و فایل .env که سرور build‌شده نادیده می‌گیرد."
date: 2026-11-13
cover: /images/blog/2026-11-13-nuxt-runtime-config-env.svg
tags: [nuxt, pro-tip, deployment]
draft: false
---

در ۷۲ ساعت گذشته چیز تازه و قابل‌توجهی منتشر نشد که یک مقالهٔ کامل بخواهد؛ تازه‌ترین موارد فقط نسخه‌های کاندیدای Vue 3.6 و وصله‌های Vite 8.x بودند. برای همین این یک نکتهٔ حرفه‌ای است دربارهٔ دسته‌ای از باگ‌ها که روی لپ‌تاپ کار می‌کنند و بعد از deploy خراب می‌شوند: `runtimeConfig` و متغیرهای محیطی.

قواعد زیر از [راهنمای runtime config در Nuxt](https://nuxt.com/docs/4.x/guide/going-further/runtime-config) و [مرجع `nuxt.config`](https://nuxt.com/docs/4.x/api/nuxt-config) آمده‌اند. هر کدام جایی است که رفتار dev و production از هم فاصله می‌گیرد.

## اشتباه اول: خواندن `process.env` در کد برنامه

```ts
// server/api/report.get.ts
export default defineEventHandler(() => {
    const key = process.env.REPORTS_API_KEY; // works in dev, fragile in production
    // ...
});
```

این کار تنها سازوکاری را دور می‌زند که Nuxt برای پیکربندی تایپ‌دار و قابل‌override در زمان deploy می‌دهد. مقدار را در `nuxt.config` تعریف کنید و با `useRuntimeConfig` بخوانید:

```ts
// nuxt.config.ts
export default defineNuxtConfig({
    runtimeConfig: {
        reportsApiKey: "", // private: server only
        public: {
            apiBase: "/api", // public: sent to the client in the payload
        },
    },
});
```

```ts
// server/api/report.get.ts
export default defineEventHandler((event) => {
    const { reportsApiKey } = useRuntimeConfig(event);
    // ...
});
```

در مسیرهای سرور، دادن `event` مهم است: مستندات آن را راهی نشان می‌دهند که overrideهای محیطی در زمان اجرا اعمال شوند.

## اشتباه دوم: تنظیم متغیر محیطی برای کلیدی که تعریف نشده

یک متغیر فقط ویژگی‌ای را override می‌کند که **از قبل** در `nuxt.config` تعریف شده باشد. متغیرهای تعریف‌نشده در دسترس قرار نمی‌گیرند. اگر `NUXT_REPORTS_API_KEY` تنظیم شده باشد ولی `reportsApiKey` در `runtimeConfig` نباشد، مقدار `undefined` می‌گیرید، بدون هیچ خطا.

قاعدهٔ نام‌گذاری مکانیکی است: حروف بزرگ، پیشوند `NUXT_`، یک `_` بین سطوح تودرتو و شکستن camelCase به کلمات. کلیدهای public کلمهٔ `PUBLIC` اضافه می‌کنند:

| کلید در config   | متغیر محیطی            |
| ---------------- | ---------------------- |
| `reportsApiKey`  | `NUXT_REPORTS_API_KEY` |
| `public.apiBase` | `NUXT_PUBLIC_API_BASE` |
| `app.baseURL`    | `NUXT_APP_BASE_URL`    |

مقدار پیش‌فرض می‌تواند رشتهٔ خالی باشد. کارش ثبت کلید و دادن نوع به آن است، نه حمل مقدار.

## اشتباه سوم: اشاره دادن مقدار پیش‌فرض به متغیری با نام دیگر

```ts
export default defineNuxtConfig({
    runtimeConfig: {
        reportsApiKey: process.env.REPORTS_API_KEY, // evaluated at build time
    },
});
```

مستندات صریح می‌گویند پیش‌فرضی که به متغیری با نام متفاوت اشاره کند فقط در زمان build کار می‌کند و در زمان اجرا خراب می‌شود. مقدار هنگام اجرای `nuxt build` ثبت می‌شود و تغییر دادن `REPORTS_API_KEY` بعداً روی سرور هیچ اثری ندارد. overrideها بر اساس نام `NUXT_` و در زمان اجرا تطبیق داده می‌شوند. اگر یک image را می‌سازید و از staging به production می‌برید، تفاوت همین است: یک artifact یا یک build برای هر محیط.

راه‌حل: کلید را با پیش‌فرض خنثی تعریف کنید و `NUXT_REPORTS_API_KEY` را همان‌جا که سرور اجرا می‌شود تنظیم کنید.

## اشتباه چهارم: انتظار `.env` در production

CLI نیوکست در توسعه، build و generate فایل `.env` را می‌خواند. **سرور build‌شده `.env` را نمی‌خواند.** در کانتینر یعنی نباید به این فایل تکیه کنید: متغیرها را از طریق محیط واقعی بدهید (`docker run --env-file`، مخزن secret سیستم orchestration یا تنظیمات پلتفرم).

```bash
# dev: .env is read by the CLI
nuxt dev

# production: the built server only sees the process environment
NUXT_REPORTS_API_KEY=... NUXT_PUBLIC_API_BASE=https://api.example.com node .output/server/index.mjs
```

نتیجهٔ ظریف: `.env` داخل image می‌تواند روی build اثر بگذارد، اما سرور در حال اجرا را پیکربندی نمی‌کند.

## تبدیل نوع می‌تواند غافلگیر کند

مقادیر محیطی با `destr` تبدیل نوع می‌شوند. مثال خود مستندات: `NUXT_MY_VAR=4848e0` به عدد `4848` تبدیل می‌شود، نه رشته. کلید API یا شناسه‌ای که شبیه عدد یا boolean باشد ممکن است نوعش عوض شود. برای حفظ رشته، گیومهٔ دوتایی را در خود مقدار بنویسید:

```bash
NUXT_MY_VAR='"4848e0"'
```

با `compatibilityVersion: 5`، به گفتهٔ مستندات هر مقدار به نوع پیش‌فرضش تبدیل می‌شود؛ booleanها `true`/`false`، `1`/`0`، `yes`/`no` و `on`/`off` را می‌پذیرند و آرایه‌ها و آبجکت‌ها از JSON پارس می‌شوند. این رفتار وابسته به نسخه است، پس پیش از تکیه بر هر حالت بررسی کنید پروژه‌تان کدام را دارد.

## با schema اعتبارسنجی کنید

مقادیر می‌توانند Standard Schema مثل Zod یا ArkType هم باشند، که «undefined در production» را به شکست هنگام راه‌اندازی تبدیل می‌کند:

```ts
import { z } from "zod";

export default defineNuxtConfig({
    runtimeConfig: {
        reportsApiKey: z.string(),
        public: {
            mode: z.enum(["preview", "production"]).default("production"),
        },
    },
});
```

طبق مستندات، مقدار schema بدون پیش‌فرض هشدار build می‌دهد و سرور تا تنظیم شدن آن بالا نمی‌آید. prerender فقط وقتی شکست می‌خورد که صفحه‌ای واقعاً مقدار غایب را بخواند. دو محدودیت: refinementهایی مثل حداقل طول بررسی نمی‌شوند و transform پشتیبانی نمی‌شود. این بررسی حضور و نوع است، نه اعتبارسنجی کامل.

## بده‌بستان‌ها و نکات احتیاطی

- **public یعنی عمومی.** هر چیز زیر `runtimeConfig.public` (و `app`) در payload هر صفحه می‌رود. secret آنجا نگذارید و کلید private را در `useState` کپی نکنید؛ ممکن است به کلاینت نشت کند.
- **فقط قابل‌سریال‌سازی.** تابع، Set و Map زنده نمی‌مانند. آن‌ها را در plugin یا middleware بسازید.
- **کلیدهای رزرو.** `app` و `appSecret` متعلق به Nuxt هستند. `appSecret` یک secret ریشهٔ private است که با `NUXT_APP_SECRET` تنظیم می‌شود؛ مستندات حداقل ۳۲ بایت تصادفی، مقدار متفاوت برای هر محیط و ثابت ماندن در deployها را می‌خواهند. buildها هرگز آن را نمی‌سازند و dev یکی در `.nuxt/app-secret` می‌سازد.
- **نوع‌ها زمان اجرا نیستند.** گسترش `RuntimeConfig` فقط نوع‌ها را عوض می‌کند. بدون schema، مقادیر هنوز با `destr` تبدیل می‌شوند و نوع ممکن است با آنچه برنامه می‌گیرد نخواند.
- **جایی که `process.env` درست است.** تنظیمات فقط‌build، مثل انتخاب گزینهٔ ماژول یا preset استقرار داخل `nuxt.config.ts`، می‌توانند `process.env` بخوانند: قرار است در زمان build ثابت شوند.

## چک‌لیست کوتاه

1. هر مقداری که با env قابل‌پیکربندی است، کلید تعریف‌شده در `runtimeConfig` دارد.
2. secretها کلید سطح‌بالا هستند؛ فقط مقادیر واقعاً امن برای کلاینت زیر `public` می‌روند.
3. برای مقادیری که باید در هر محیط عوض شوند، پیش‌فرض `process.env.OTHER_NAME` نداشته باشید.
4. production متغیرها را از محیط واقعی می‌گیرد، هرگز از `.env`.
5. هر چیزی که باید وجود داشته باشد schema دارد، تا مقدار غایب سرور را متوقف کند، نه اینکه بعداً یک درخواست را خراب کند.

## منابع

- [Nuxt runtime config guide](https://nuxt.com/docs/4.x/guide/going-further/runtime-config)
- [Nuxt configuration reference](https://nuxt.com/docs/4.x/api/nuxt-config)
- [Vue core releases](https://github.com/vuejs/core/releases)
- [Vite releases](https://github.com/vitejs/vite/releases)
