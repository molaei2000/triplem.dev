---
title: "انتشار امنیتی نوامبر ۲۰۲۶ در Next.js: هفت advisory که چهار تای آن‌ها به use cache مربوط است"
description: "Next.js 16.4.5 و 15.5.29 هفت advisory را برطرف می‌کنند. چهار مورد به use cache و Cache Components مربوط است؛ چه کسانی در معرض‌اند و چگونه بررسی کنیم."
date: 2026-11-04
cover: /images/blog/2026-11-04-nextjs-november-2026-security-release.svg
tags: [next.js, security, caching]
draft: false
---

انتشار زمان‌بندی‌شدهٔ نوامبر برای Next.js [در ۳ نوامبر منتشر شد](https://nextjs.org/blog/november-2026-security-release) و نسخه‌های v16.4.5 (Active LTS) و v15.5.29 (Maintenance LTS) را آورد. [یک هفته قبل اعلام شده بود](https://nextjs.org/blog/upcoming-nextjs-security-release-november-2026). هفت advisory در آن است و الگو روشن است: چهار مورد دربارهٔ هویت کش (cache identity) در `use cache` و Cache Components هستند. اگر بعد از اینکه 16.4 این قابلیت را توصیه‌شده کرد به Cache Components رفته‌اید، این انتشار به شما مربوط است.

```bash
npm install next@16.4.5   # 16.x line
npm install next@15.5.29  # 15.5 line
```

[یادداشت‌های انتشار v16.4.5](https://github.com/vercel/next.js/releases/tag/v16.4.5) هر هفت مورد را فهرست می‌کند. یادداشت‌های 15.5.29 سه مورد را فهرست می‌کنند: تزریق پاسخ، دور زدن SVG و افشای کوکی در Edge. این با شرایط زیر سازگار است، چون مشکلات کش به `use cache` نیاز دارند.

## چهار advisory کش

هر چهار یک شکل دارند: دو درخواست که باید ورودی کش جدا داشته باشند، به یک ورودی مشترک می‌رسند. هیچ‌کدام به مهاجم اجازهٔ خواندن ورودی‌های دلخواه را نمی‌دهد؛ هر کدام محتوایی را که خود برنامهٔ شما تولید کرده دوباره استفاده می‌کند.

**۱. `unstable_cache` همراه با `use cache` ([GHSA-mfr8-8qww-v76h](https://github.com/vercel/next.js/security/advisories/GHSA-mfr8-8qww-v76h)).** به Cache Components فعال، یک تابع عمومی `use cache` که root parameter می‌خواند (مثال نوشته: شناسهٔ tenant) و همان تابع که هم مستقیم و هم داخل `unstable_cache` صدا زده می‌شود نیاز دارد. هنگام پر شدن سرد کش، فراخوانی همزمان از طریق `unstable_cache` می‌تواند نتیجهٔ درخواست دیگری را بدون بررسی root parameterها بگیرد و نتیجه ذخیره و تا زمان revalidate یا حذف به فراخواننده‌های بعدی با همان آرگومان‌ها داده شود.

```ts
// The risky combination, in outline
import { unstable_cache } from "next/cache";

async function getPrices(plan: string) {
    "use cache";
    const tenant = await tenantFromRootParams(); // reads a root param
    return db.prices.find({ tenant, plan });
}

// called directly in one place...
const direct = await getPrices("pro");
// ...and wrapped in unstable_cache in another
const wrapped = await unstable_cache(() => getPrices("pro"), ["prices"])();
```

`tenantFromRootParams` یک نام جایگزین از من است، نه API در Next.js. چیزی که باید دنبالش بگردید خود این ترکیب است. اگر در میانهٔ مهاجرت از `unstable_cache` به `use cache` هستید، دقیقاً در همین وضعیت‌اید.

**۲. `use cache` تو در تو ([GHSA-vc7v-qv4w-wrv8](https://github.com/vercel/next.js/security/advisories/GHSA-vc7v-qv4w-wrv8)).** یک تابع کش‌شدهٔ داخلی root parameter می‌خواند و یک مقدار زودرس را همراه با یک مقدار async کندتر برمی‌گرداند، در حالی که تابع بیرونی بدون منتظر ماندن برای بخش کند تمام می‌شود. ورودی بیرونی ممکن است پیش از ثبت وابستگی‌های root parameter تابع داخلی ذخیره شود، پس محتوای مخصوص tenant، سایت یا locale می‌تواند از مرز مسیریابی عبور کند.

**۳. آرگومان‌های باینری ([GHSA-rhh4-g77r-r9qj](https://github.com/vercel/next.js/security/advisories/GHSA-rhh4-g77r-r9qj)).** آرگومان‌های باینری متفاوت به یک تابع `use cache` می‌توانند هویت کش یکسان بسازند. اگر این آرگومان‌ها کاربران یا حساب‌ها را از هم جدا کنند و بقیهٔ هویت یکی باشد، یک فراخواننده می‌تواند نتیجهٔ کش‌شدهٔ دیگری را بگیرد یا نتیجهٔ خودش را به او برساند.

**۴. مسموم شدن shell مشترک (در پست لینک GHSA ندارد).** روی `next start` خودمیزبان با Cache Components فعال و Partial Prefetching غیرفعال یا تنظیم‌نشده اثر دارد. یک URL دست‌ساز می‌تواند مقادیر مخصوص درخواست را در shellی بگذارد که URLهای دیگر استفاده می‌کنند و نتیجه رندر سمت سرور نادرست یا 404 ماندگار است. شکل مسیر محدود است: یک پارامتر پویای قابل prerender که با مقداری درخواست شود که هنگام build تولید نشده، دست‌کم دو پارامتر عمیق‌تر که هرگز prerender نمی‌شوند، یک blocking fallback shell و یک layout که پارامتر کم‌عمق‌تر از آن دو را داخل Suspense می‌خواند. مقادیر تولیدشده در build و پیکربندی‌هایی با Partial Prefetching فعال در آزمایش‌های گزارش‌شده تحت تأثیر نبودند.

## سه مورد دیگر

- **framing پاسخ ([GHSA-pc58-hwjq-p385](https://github.com/vercel/next.js/security/advisories/GHSA-pc58-hwjq-p385)).** برنامه‌های خودمیزبانی که یک `Response` واکشی‌شدهٔ تحت کنترل مهاجم را بدون تغییر برمی‌گردانند، می‌توانند بایت‌های decompress‌شده را با هدرهای framing پاسخ فشردهٔ اصلی ارسال کنند. پشت یک reverse proxy از نوع HTTP/1.1 که درخواست‌های pipeline‌شده را روی یک اتصال backend مشترک صف می‌کند، ممکن است پاسخ‌ها به مشتری اشتباه برسند. پست تأکید می‌کند این مورد برای همهٔ پیکربندی‌های پراکسی صدق نمی‌کند.
- **کوکی‌های Edge ([GHSA-f3mh-rxg3-f5g2](https://github.com/vercel/next.js/security/advisories/GHSA-f3mh-rxg3-f5g2)).** Route Handlerهای Edge در App Router و API routeهای Edge در Pages Router که `NextResponse.cookies.set()` را صدا می‌زنند، می‌توانند کوکی سریالایزشده را در هدر داخلی `x-middleware-set-cookie` فاش کنند؛ هدری که JavaScript هم‌مبدأ حتی برای کوکی‌های `HttpOnly` می‌تواند بخواند. به یک کوکی حساس و اسکریپت تحت کنترل مهاجم روی مبدأ شما نیاز دارد. Route Handlerهای Node.js و `cookies().set()` در بازتولید تحت تأثیر نبودند.
- **دور زدن رد SVG در بهینه‌سازی تصویر ([GHSA-7qx7-33qx-rqx2](https://github.com/vercel/next.js/security/advisories/GHSA-7qx7-33qx-rqx2)).** تصویری از یک منبع مجاز می‌تواند به‌اشتباه AVIF تشخیص داده شود، از `images.dangerouslyAllowSVG: false` رد شود و سپس توسط backend بومی که SVG را پشتیبانی می‌کند به‌عنوان SVG رمزگشایی شود. فهرست مجاز منابع همچنان اعمال می‌شود و پست می‌گوید این مورد به‌تنهایی XSS یا RCE را نشان نمی‌دهد؛ فقط مواجهه با اتمام منابع parser یا باگ‌های decoder را بیشتر می‌کند.

## ناهماهنگی در شدت

پست وبلاگ advisory اول را High و بقیه را Medium نامیده، اما یادداشت‌های انتشار GitHub هر هفت را زیر عنوان Moderate آورده‌اند. از صفحه‌هایی که خواندم نمی‌توانم بگویم کدام با رکورد advisoryها یکی است؛ صفحهٔ هر GHSA را بررسی کنید. همچنین دستور نصب پست برای 16.4.5 کامنت «for 16.5» دارد؛ آنچه مهم است شمارهٔ نسخه در خود دستور است.

## چگونه بررسی کنیم

1. **استفاده از `use cache` را پیدا کنید.** `grep -rn "use cache" app` به‌علاوهٔ هر import از `unstable_cache`. بدون Cache Components، مشکل کش وجود ندارد.
2. **دنبال root parameterهایی بگردید که داخل توابع کش‌شده خوانده می‌شوند**، به‌خصوص tenant، سایت یا locale. این‌ها دادهٔ نشت‌کننده‌اند.
3. **دنبال آرگومان‌های باینری بگردید** (`Buffer`، `Uint8Array`، `ArrayBuffer`) که به توابع کش‌شده‌ای می‌روند که بر اساس کاربر جدا می‌کنند.
4. **خودمیزبان‌ها:** بررسی کنید آیا اشیای `Response` واکشی‌شده را مستقیم از handlerها برمی‌گردانید و چه چیزی بین شما و کلاینت است. Partial Prefetching و شکل مسیرهایتان را با advisory مربوط به shell مقایسه کنید.
5. **routeهای Edge:** `NextResponse.cookies.set` را در routeهایی با `runtime = "edge"` جست‌وجو کنید. اگر سطح حمله کمتر می‌خواهید، پس از وصله موارد حساس را به Node.js ببرید و کوکی‌های نشست که ممکن است فاش شده باشند را قابل چرخش بدانید.
6. **پیکربندی تصویر:** اگر `remotePatterns` سخاوتمندانه دارید، وصله کردن از لحن پست فوری‌تر است.

## بده‌بستان‌ها و هشدارها

- ورودی‌های کشی که پیش از ارتقا پر شده‌اند ممکن است هنوز محتوای اشتباهاً مشترک داشته باشند. برای advisory اول، پست می‌گوید نتیجهٔ اشتباه ذخیره‌شده تا revalidate یا حذف سرو می‌شود؛ پس بعد از وصله، باطل کردن دادهٔ کش‌شدهٔ مخصوص tenant را در نظر بگیرید. اینکه deploy کش شما را پاک می‌کند یا نه به cache handler بستگی دارد که بررسی نکردم.
- دادهٔ مخصوص tenant برای هر کش مشترکی که کلیدش ضمنی است جای بدی است. حتی بعد از وصله، اگر می‌توانید tenant را در آرگومان‌های تابع بگذارید تا هویت در code review دیده شود.
- فهرست وبلاگ Next.js انتشار یا به‌روزرسانی امنیتی را در ۲۲ سپتامبر، ۳۰ سپتامبر، ۱۴ اکتبر و اکنون ۳ نوامبر نشان می‌دهد. یک مسیر انتشار منظم کمک می‌کند، اما آهنگ وصله کردن حالا بخشی از اداره کردن این فریم‌ورک است.
- من فقط یادداشت‌های انتشار و پست وبلاگ را خواندم، نه صفحهٔ تک‌تک GHSAها؛ پس بازه‌های نسخهٔ آسیب‌پذیر فراتر از آنچه بالا آمده اینجا پوشش داده نشده است.

## منابع

- [November 2026 Security Release](https://nextjs.org/blog/november-2026-security-release)
- [Next.js blog index](https://nextjs.org/blog)
- [Next.js v16.4.5 release notes](https://github.com/vercel/next.js/releases/tag/v16.4.5)
- [Next.js releases list](https://github.com/vercel/next.js/releases)
