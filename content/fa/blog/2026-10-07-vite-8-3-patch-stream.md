---
title: "Vite 8.3.3: خط 8.3 برای بیلدهای عصر Rolldown چه چیزی عوض کرد"
description: "Vite 8.3.3 در ۶ اکتبر پس از 8.3.0 پرقابلیت منتشر شد. تغییرات ادغام کانفیگ، bundled dev، renderBuiltUrl و optimizer و مواردی که باید بررسی کنید."
date: 2026-10-07
cover: /images/blog/2026-10-07-vite-8-3-patch-stream.svg
tags: [vite, tooling, rolldown]
draft: false
---

Vite 8.3.3 در ۶ اکتبر منتشر شد. به‌تنهایی فقط یک پچ با چهار اصلاح است، اما پایان ماهی است که در آن خط 8.3 از یک انتشار پرقابلیت (8.3.0 در ۱۰ سپتامبر) به سه پچ رسید. اگر [changelog](https://raw.githubusercontent.com/vitejs/vite/main/packages/vite/CHANGELOG.md) را کنار هم بخوانید، نشان می‌دهد Vite مبتنی بر Rolldown هنوز کجاها ناهموار است: ادغام کانفیگ، حالت تجربی bundled dev و optimizer وابستگی‌ها.

## 8.3.0 چه چیزی اضافه کرد

انتشار ۱۰ سپتامبر قابلیت‌های اصلی را آورد. مواردی که برای کد اپلیکیشن مهم‌اند:

- گزینه‌ی سطح‌بالای `tsconfig` در کانفیگ Vite.
- `server.watch` اکنون گزینه‌های watch در Rolldown را می‌پذیرد.
- هوک‌های `closeServer` و `closePreviewServer` برای پلاگین‌ها.
- subpath importها (`#internal/...`) داخل `import()` پویا هم کار می‌کنند.
- `import.meta.ROLLDOWN_FILE_URL_*` برای دارایی‌هایی که از JavaScript ارجاع داده می‌شوند به کار می‌رود و به پلاگین‌های دیگر هم گسترش یافته است.
- تگ‌های style در CSS کوچک (minify) می‌شوند و search paramهای workerها حفظ می‌شوند.
- هشدار کانفیگ برای named import از ماژول‌های JSON.
- `--profile [name]` در CLI تا پروفایل‌های CPU نام بگیرند.
- هشدار وقتی پلاگینِ برگردانده‌شده از `applyToEnvironment` هوک‌های پشتیبانی‌نشده در آن محیط را به کار می‌برد.

دو مورد آخر برای DX ساکت اما مفیدند. نام‌گذاری پروفایل‌ها مقایسه‌ی قبل و بعد را در artifactهای CI قابل ردیابی می‌کند:

```bash
vite build --profile baseline
# change something
vite build --profile after-chunk-split
```

هشدار JSON ارزش یک نگاه دارد: دنبال named importها از فایل‌های `.json` بگردید، مثل `import { version } from "./package.json"`، و ببینید بیلد شما حالا هشدار می‌دهد یا نه. changelog جایگزین پیشنهادی را نمی‌گوید.

## 8.3.1 و 8.3.2: اصلاحات ادغام و optimizer

مصالحه‌ها در پچ‌ها دیده می‌شوند. چند اصلاح مربوط به `mergeConfig` و گزینه‌های مختص Rolldown است:

- 8.3.1 ادغام `build.rolldownOptions.output.comments` را درست می‌کند و `server.ws: false` را در `mergeConfig` درست مدیریت می‌کند.
- 8.3.2 ادغام `build.rolldownOptions.output.minify` را درست می‌کند.

اگر یک کانفیگ پایه دارید و آن را برای هر اپ یا هر محیط گسترش می‌دهید، الگوی تحت‌تأثیر این بود:

```ts
import { defineConfig, mergeConfig } from "vite";

const base = defineConfig({
    build: { rolldownOptions: { output: { minify: true } } },
});

export default mergeConfig(
    base,
    defineConfig({
        build: { rolldownOptions: { output: { minify: false } } },
    }),
);
```

changelog فقط می‌گوید ادغام اصلاح شد و شکل خرابی قبلی را توضیح نمی‌دهد. پس توصیه‌ی عملی این است که خروجی بیلد هر اپی را که این گزینه‌ها را از طریق `mergeConfig` بازنویسی می‌کند بررسی کنید و جهت باگ را حدس نزنید.

optimizer در این دو پچ سه اصلاح قابل‌توجه گرفت:

- دیگر importهایی را که نام binding آن‌ها با `type` شروع می‌شود نادیده نمی‌گیرد (8.3.1).
- وابستگی‌های کشف‌شده‌ی هنوز-در-انتظار پیش از مقداردهی اولیه پردازش می‌شوند (8.3.1).
- fallbackهای `require` برای peerهای اختیاریِ exclude‌شده حفظ می‌شوند (8.3.2) و هشدار برای mapهای `browser: false` پشتیبانی‌نشده حذف می‌شود.

اگر روی نصب 8.3.0 بعد از کشف وابستگی‌ها با export گمشده یا reload کامل غیرمنتظره روبه‌رو شده‌اید، این موارد اولین جاهایی هستند که باید مقایسه کنید.

## bundled dev مدام اصلاح می‌شود

changelog به محیطی با نام «bundled-dev» اشاره می‌کند که برداشت من آن را همان حالت تجربی چرخه‌ی 8.1 می‌داند ([بلاگ Vite](https://vite.dev/blog) مطلب «Announcing Vite 8.1» را در ۲۳ ژوئن فهرست کرده؛ آن مطلب را نخوانده‌ام). 8.3.2 دو اصلاح مخصوص آن دارد: sourcemap چانک‌های lazy اکنون سرو می‌شود و runtime مربوط به Rolldown از پکیج نصب‌شده‌ی Rolldown سرو می‌شود. این را نشانه‌ی بلوغ‌نیافتگی حالت بدانید. اگر آن را فعال کرده‌اید، نسخه‌ی minor را pin کنید و راهی برای بازگشت به dev server پیش‌فرض نگه دارید.

## renderBuiltUrl و preload شدن CSS

8.3.2 دو چیز مرتبط را تغییر داد. preload شدن CSS وقتی `renderBuiltUrl` آدرس‌هایی با query parameter تولید می‌کند اصلاح شده و queryها اکنون به `renderBuiltUrl` پاس داده می‌شوند. اگر دارایی‌ها را از CDN سرو می‌کنید و در `renderBuiltUrl` یک query برای cache-busting یا امضا اضافه می‌کنید، یک بیلد production را با یک route لودشونده‌ی lazy تست کنید: مسیر preload همان بخش تحت‌تأثیر بود. 8.3.2 همچنین یک اسکن لینک با پیچیدگی درجه دو را در helper مربوط به preload حذف کرد که برای اپ‌های دارای چانک‌های CSS زیاد اهمیت دارد.

## موارد کوچک‌تر

- 8.3.2 از encode کردن source mapهای میانی پرهیز می‌کند، بهبودی در کارایی بیلد. عددی منتشر نشده، پس روی پروژه‌ی خودتان اندازه بگیرید.
- خروجی object و array در `forwardConsole` اکنون محدود شده تا لاگ بیش‌ازحد نشود.
- `sourceURL` در module runner مربوط به SSR اکنون فاصله‌ها را encode می‌کند.
- هنگام استفاده از terser، آدرس workerها بین کلاینت و سرور هم‌تراز شده است.
- 8.3.2 مخزن را از `cross-spawn` به `tinyexec` می‌برد و وابستگی Vitest را به v5 ارتقا می‌دهد. هر دو داخلی‌اند.
- 8.3.3 برای درخواست‌های `?vite-wasm-instance` مقدار `fs.serve` را بررسی می‌کند، `safeModulePaths` را به‌جای URL با id ذخیره می‌کند و query را از نام فایلی که به `transformIndexHtml` می‌رسد حذف می‌کند.

مورد آخر می‌تواند نویسندگان پلاگین را اذیت کند. اگر هوک `transformIndexHtml` شما query را از نام فایل پارس می‌کرد، دیگر آن را نمی‌بیند:

```ts
const plugin = {
    name: "html-tweaks",
    transformIndexHtml(html, ctx) {
        // ctx.filename no longer carries a query string as of 8.3.3
        return html;
    },
};
```

changelog می‌گوید نام فایل نباید query داشته باشد؛ اما نمی‌گوید کدام مسیرها قبلاً داشتند. پس پلاگین‌هایتان را برای هر پارس `ctx.filename` جست‌وجو کنید.

## بک‌پورت‌ها

در ۶ اکتبر [صفحه‌ی releases](https://github.com/vitejs/vite/releases) نسخه‌های 8.2.4، 8.1.6، 7.3.7 و 6.4.4 را هم فهرست کرده است. یادداشت‌های 8.3.3 که توانستم بخوانم هیچ advisory امنیتی یا بک‌پورتی را ذکر نمی‌کنند و محتوای تگ‌های دیگر را ندیدم، پس درباره‌ی اصلاحات آن‌ها حدس نمی‌زنم. آنچه فهرست نشان می‌دهد این است که Vite همزمان چهار خط قدیمی‌تر را پچ می‌کند. اگر روی 6.x یا 7.x هستید، بدون ارتقای major هم پچ در دسترس است.

## آیا ارتقا بدهید؟

برای بیشتر پروژه‌های روی 8.3.x، 8.3.3 را بگیرید: یک پچ است و دو اصلاحی که به ادغام کانفیگ و تبدیل HTML مربوط‌اند دقیقاً از نوعی هستند که تا وقتی بیلد production فرق نکند دیده نمی‌شوند. مسیر ارتقا:

```bash
pnpm up vite@^8.3.3
pnpm build && pnpm preview
```

خروجی بیلد را برای اپ‌هایی که `build.rolldownOptions.output.*` را بازنویسی می‌کنند یا `renderBuiltUrl` تعریف کرده‌اند مقایسه کنید. تا وقتی نرخ اصلاحات bundled dev پایین نیامده، آن را در جریان‌های حیاتی production استفاده نکنید.

یک هشدار: ورودی‌های changelog یک‌خطی و کوتاه‌اند و چند رفتار بالا از روی عنوان‌ها استنباط شده‌اند. پیش از تکیه بر هر حالت مرزی خاص، pull requestهای مربوط را بخوانید.

## منابع

- https://raw.githubusercontent.com/vitejs/vite/main/packages/vite/CHANGELOG.md
- https://github.com/vitejs/vite/releases
- https://github.com/vitejs/vite/releases/tag/v8.3.3
- https://github.com/vitejs/vite/releases/tag/v8.2.4
- https://vite.dev/blog
