---
title: "Next.js 16.4.5: چهار هشدار از هفت هشدار دربارهٔ use cache است، پس کلیدهای کش را بررسی کنید"
description: "Next.js 16.4.5 و 15.5.29 اصلاح‌های امنیتی متوسط دارند: نشت use cache میان root paramها، fallback shell مسموم و افشای کوکی در Edge. اول چه چیزی را بررسی کنیم."
date: 2026-11-05
cover: /images/blog/2026-11-05-nextjs-16-4-5-use-cache-advisories.svg
tags: [next.js, security, caching]
draft: false
---

دو روز بعد از [نسخهٔ امنیتی Nuxt 4.6.4](/fa/blog/2026-11-03-nuxt-4-6-4-security)، نوبت Next.js بود. در ۳ نوامبر تیم [v16.4.5](https://github.com/vercel/next.js/releases/tag/v16.4.5) را با هفت هشدار منتشر کرد که همه شدت Moderate دارند، و [v15.5.29](https://github.com/vercel/next.js/releases/tag/v15.5.29) را با سه تا از آن‌ها. یک روز قبل‌تر [v16.4.4](https://github.com/vercel/next.js/releases/tag/v16.4.4) یک نسخهٔ backport معمولی بود.

```bash
npm install next@16.4.5   # 16.x line
npm install next@15.5.29  # 15.x line
```

یک نکته دربارهٔ منبع: یادداشت‌های انتشار فقط عنوان هشدارها را می‌آورند. صفحه‌های هشداری که توانستم بخوانم بازهٔ نسخه‌های آسیب‌پذیر و شرایط را شرح می‌دهند، اما نسخهٔ اصلاح‌شده را ذکر نکرده‌اند. پس «به آخرین patch خط خودتان ارتقا دهید» را همان چیزی بدانید که صفحه‌های انتشار ضمناً پیشنهاد می‌کنند و در خود هشدار تأییدش کنید.

## الگوی مشترک: چهار هشدار دربارهٔ هویت کلید کش

عنوان چهار هشدار از هفت هشدار به `'use cache'` و Cache Components مربوط است. وجه مشترک این است که یک ورودی کش زیر کلیدی ذخیره یا برگردانده می‌شود که از دادهٔ داخلش باریک‌تر یا پهن‌تر است.

| هشدار | عنوان (خلاصه) |
| --- | --- |
| GHSA-mfr8-8qww-v76h | افشای بین‌tenantی در `'use cache'` که از راه `unstable_cache` صدا زده شود |
| GHSA-vc7v-qv4w-wrv8 | نشت کش میان مقدارهای root param در تابع‌های تودرتوی `'use cache'` (اصلاح تکمیلی) |
| GHSA-vvgp-ww4w-46vf | مسمومیت کش fallback shellهای مشترک با route paramهای جایگزینی که درخواست می‌فرستد |
| GHSA-rhh4-g77r-r9qj | افشا و مسمومیت بین‌کاربری در `use cache` با آرگومان‌های باینری |

فقط صفحهٔ هشدار اول و سوم را خواندم، پس جزئیات زیر فقط برای همین دو است؛ برای دو مورد دیگر به عنوان‌های یادداشت انتشار تکیه می‌کنم.

### نشت root param از راه `unstable_cache`

[GHSA-mfr8-8qww-v76h](https://github.com/vercel/next.js/security/advisories/GHSA-mfr8-8qww-v76h) (‏CVSS 4.0 برابر 6.3، نسخهٔ 16.3.0 به بعد) شکل مشخصی لازم دارد: همان تابع `'use cache'` هم مستقیم در رندر صدا زده شود و هم از راه `unstable_cache()`، و یک root param مثل locale را بخواند. اگر یک فراخوانی `unstable_cache()` وسط اولین پر شدن کش بعد از شروع پردازش برسد، یک race در dedupe میان درخواست‌ها می‌تواند دادهٔ کش‌شده برای مقدار دیگری از root param را به آن بدهد. نتیجه زیر کلیدی بدون root param ذخیره می‌شود و درخواست‌های بعدی تا revalidate یا حذف همان را می‌گیرند.

الگو این شکل است:

```ts
import { unstable_cache } from "next/cache";
import { cookies } from "next/headers";

async function getPrices() {
    "use cache";
    // reads a root param (e.g. locale) somewhere inside
    return loadPrices();
}

// Nesting a 'use cache' function inside unstable_cache is the risky shape.
const cached = unstable_cache(async () => getPrices(), ["prices"]);
```

راهکار هشدار این است که تابع‌های `'use cache'` را داخل `unstable_cache()` تودرتو نکنید. هشدار می‌گوید بیرون از race هم Next.js برای این الگو خطا می‌دهد، پس پرهیز از آن مواجهه را کاملاً از بین می‌برد. در مخزن دنبال wrapperهای `unstable_cache` بگردید که callbackشان به تابعی با `"use cache"` می‌رسد. اگر در اپ Cache Components هنوز جایی `unstable_cache` دارید، حالا زمان خوبی است آن را به `'use cache'` با `cacheTag` ببرید، چون ترکیب این دو مدل کلید را مبهم می‌کند.

### fallback shellهای مسموم

[GHSA-vvgp-ww4w-46vf](https://github.com/vercel/next.js/security/advisories/GHSA-vvgp-ww4w-46vf) (‏CVSS 4.0 برابر 6.3، نسخهٔ 16.4.0 به بعد) فهرست شرط‌های بلندتری دارد که همه باید برقرار باشند:

- `cacheComponents: true` و `partialPrefetching` تنظیم‌نشده یا `false`
- self-host با `next start`
- یک مسیر دینامیک با پارامتر قابل prerender (از راه `generateStaticParams`) که مقدار درخواست‌شده‌اش در build تولید نشده
- دست‌کم دو پارامتر هرگز-prerender-نشدنی زیر آن، با layoutی که پارامتر بالاتر را داخل یک Suspense boundary می‌خواند
- یک blocking fallback shell

آن‌وقت یک GET بدون احراز هویت می‌تواند shellی را مسموم کند که همهٔ مسیرهای زیرش مشترک‌اند. اگر layout تابع `notFound()` را صدا بزند، همان ۴۰۴ کش‌شده برای همهٔ URLهای زیر آن کلید با `revalidate: false` برگردانده می‌شود، از restart جان سالم به در می‌برد و خطایی لاگ نمی‌شود. اگر layout مقدار پارامتر را رندر کند، HTML سمت سرور مقدار مهاجم را نشان می‌دهد (کلاینت هنگام hydration آن را اصلاح می‌کند). راه‌حل مستندشده `partialPrefetching: true` در `next.config` است.

```ts
// next.config.ts
import type { NextConfig } from "next";

const config: NextConfig = {
    cacheComponents: true,
    // Workaround listed in the advisory until you can upgrade.
    partialPrefetching: true,
};
export default config;
```

ماجرای ۴۰۴ ماندگار از نظر عملیاتی بدترین است: هیچ چیز در لاگ‌ها نمی‌گوید چرا مجموعه‌ای از مسیرها از کار افتاده و restart هم آن را پاک نمی‌کند. اگر روی یک اپ self-host با Cache Components زیر یک segment دینامیک ۴۰۴ ناشناخته دیده‌اید، اول همین را بررسی کنید.

## هشدارهای غیر کش

### کوکی‌های HttpOnly روی مسیرهای Edge

[GHSA-f3mh-rxg3-f5g2](https://github.com/vercel/next.js/security/advisories/GHSA-f3mh-rxg3-f5g2) (‏CVSS 4.0 برابر 6.0) نسخه‌های 16.0.0 تا 16.4.2 و 15.0.0 تا 15.5.28 را درگیر می‌کند. وقتی یک مسیر Edge runtime (route handler در App Router یا Edge API route در Pages Router) با `NextResponse` کوکی بگذارد، Next.js هدر داخلی `x-middleware-set-cookie` را در پاسخ عمومی نشت می‌دهد. این هدر مقدار و ویژگی‌های کوکی را تکرار می‌کند، پس JavaScript هم‌origin می‌تواند کوکی‌ای را بخواند که HttpOnly علامت زده بودید. هشدار هیچ workaroundی نمی‌آورد. اگر کوکی نشست را از handlerهای Edge صادر می‌کنید، این مورد اولویت دارد و چرخاندن نشست‌هایی که پیش از patch صادر شده‌اند را هم در نظر بگیرید.

### ناهماهنگی پاسخ‌ها در استقرارهای self-host

[GHSA-pc58-hwjq-p385](https://github.com/vercel/next.js/security/advisories/GHSA-pc58-hwjq-p385) (‏CVSS 4.0 برابر 6.3) دربارهٔ اپ‌های self-host است که پاسخ upstream واکشی‌شده را بدون تغییر برمی‌گردانند. پشت یک reverse proxy از نوع HTTP/1.1 که پاسخ‌های pipeline‌شده را صف می‌کند، upstreamی که مهاجم کنترلش می‌کند و framing اعلام‌شده‌اش با بدنه نمی‌خواند می‌تواند پاسخ‌ها را میان کلاینت‌ها از همگام خارج کند. صفحهٔ هشدار بازهٔ نسخه‌ها را ناسازگار نوشته، پس نمی‌توانم یک بازه نقل کنم. workaroundی ذکر نشده، اما شکل مسئله یک کاهش ریسک را پیشنهاد می‌کند: به‌جای فوروارد مستقیم، یک `Response` تازه از بدنه و هدرهای انتخاب‌شدهٔ upstream بسازید. این برداشت خودم است، نه توصیهٔ هشدار.

### دور زدن رد SVG

مورد هفتم، GHSA-7qx7-33qx-rqx2، دور زدن رد شدن SVG در بهینه‌سازی تصویر است. یادداشت انتشار فقط عنوان را می‌دهد و هشدار را نخواندم، پس بیشتر نمی‌توانم بگویم.

## این هفته چه کنیم

1. به 16.4.5 یا 15.5.29 ارتقا دهید و بدانید روی کدام خط هستید: برای 15.x فقط سه هشدار غیر کش فهرست شده است.
2. دنبال `unstable_cache` بگردید که تابع‌های `"use cache"` را در بر می‌گیرد.
3. اگر با `cacheComponents: true` self-host می‌کنید، ببینید مسیرهایتان با شرط‌های fallback shell می‌خوانند یا نه، و اگر فوری نمی‌توانید ارتقا دهید `partialPrefetching: true` بگذارید.
4. جاهایی را که مسیرهای Edge کوکی نشست می‌گذارند مرور کنید.
5. ببینید reverse proxy شما با HTTP/1.1 pipelining چه می‌کند و آیا مسیری پاسخ `fetch` upstream را بدون تغییر برمی‌گرداند.

## مصالحه‌ها

`partialPrefetching: true` رفتار prefetch شل‌ها را عوض می‌کند و یک سوئیچ صرفاً امنیتی نیست، پس بعد از فعال کردنش ناوبری را تست کنید. حذف تودرتویی `unstable_cache` ممکن است به بازنویسی helperهای دادهٔ مشترک بکشد. هیچ‌کدام دلیل تأخیر ارتقا نیست، اما دلیل است که مجموعهٔ E2E را روی بیلد patch‌شده اجرا کنید و فقط به بالا بردن نسخه بسنده نکنید.

## منابع

- [Next.js v16.4.5 release notes](https://github.com/vercel/next.js/releases/tag/v16.4.5)
- [Next.js v15.5.29 release notes](https://github.com/vercel/next.js/releases/tag/v15.5.29)
- [Next.js releases index](https://github.com/vercel/next.js/releases)
- [GHSA-mfr8-8qww-v76h](https://github.com/vercel/next.js/security/advisories/GHSA-mfr8-8qww-v76h)
- [GHSA-vvgp-ww4w-46vf](https://github.com/vercel/next.js/security/advisories/GHSA-vvgp-ww4w-46vf)
- [GHSA-pc58-hwjq-p385](https://github.com/vercel/next.js/security/advisories/GHSA-pc58-hwjq-p385)
- [GHSA-f3mh-rxg3-f5g2](https://github.com/vercel/next.js/security/advisories/GHSA-f3mh-rxg3-f5g2)
