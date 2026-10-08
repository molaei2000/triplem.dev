---
title: "Next.js 16.4: توصیهٔ رسمی Cache Components، همراه با ensureStatic و navigation()"
description: "Next.js 16.4 استفاده از Cache Components را برای همهٔ اپ‌ها توصیه می‌کند و ensureStatic، navigation()، prefetch()، ارتقای عامل‌محور و کش کوچک‌تر Turbopack را اضافه می‌کند."
date: 2026-10-08
cover: /images/blog/2026-10-08-nextjs-16-4-cache-components.svg
tags: [next.js, caching, turbopack]
draft: true
---

[Next.js 16.4](https://nextjs.org/blog/next-16-4) در ۶ اکتبر منتشر شد. نکتهٔ اصلی آن یک قابلیت تکی نیست، بلکه تغییر موضع است: تیم Next.js اکنون Cache Components را برای همهٔ اپ‌ها توصیه می‌کند، می‌گوید در Next.js 17 پیش‌فرض می‌شود و برای هر پروژه‌ای که با `create-next-app` ساخته شود از همین حالا فعال است. این نسخه همچنین مواردی را اضافه می‌کند که به گفتهٔ خودشان پیش از این، مانع توصیهٔ همگانی بودند.

## خط پایهٔ جدید

Cache Components مدل کش اختیاریِ مبتنی بر `'use cache'` است که پست آن را نسخهٔ سطح کامپوننتِ هدر `Cache-Control` توصیف می‌کند. کامپوننت‌های علامت‌خورده می‌توانند هنگام ناوبری سمت کلاینت در مرورگر و، در صورت نیاز، روی سرور یا زمان build کش شوند. این مدل جایگزین کش ضمنیِ نسخه‌های قبلی App Router است. فعال‌سازی با دو فلگ انجام می‌شود:

```ts
// next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    cacheComponents: true,
    partialPrefetching: true,
};

export default nextConfig;
```

Partial Prefetching اکنون بخشی از خود مدل محسوب می‌شود و نه افزونه‌ای جدا، پس این دو فلگ با هم می‌آیند.

## `ensureStatic`: تضمین در زمان build

قدرت این مدل در استریم یک static shell همراه با بخش‌های داینامیک در یک پاسخ است. ضعفش این است که یک کامپوننت داینامیکِ ناخواسته می‌تواند بی‌صدا یک صفحهٔ بازاریابی یا وبلاگ را به محاسبهٔ زمان درخواست تبدیل کند. نسخهٔ 16.4 یک export در سطح route segment اضافه کرده که این وضعیت را به شکست build تبدیل می‌کند:

```tsx
// app/blog/[slug]/page.tsx
export const ensureStatic = "navigation";

export default function Page() {
    return (
        <>
            <UserAvatar /> {/* dynamic: fails the build */}
            <Content />
        </>
    );
}
```

سه سطح وجود دارد، از ملایم‌ترین تا سخت‌گیرانه‌ترین:

- `"shell"`: هنگام اولین کشف route فقط محتوای استاتیک دریافت می‌شود.
- `"prefetch"`: لینک‌هایی که prefetch صریح دارند فقط محتوای استاتیک می‌گیرند.
- `"navigation"`: ناوبری به این route هرگز در زمان درخواست رندر نمی‌شود.

در layout هم کار می‌کند و تضمین را برای همهٔ صفحات زیرمجموعه اعمال می‌کند. گذاشتن `"navigation"` در root layout و شل‌کردن آن در layoutهای تو در تو، پیش‌فرض معقولی برای سایت‌های محتوایی است و باعث می‌شود «کسی در یک کامپوننت مشترک `cookies()` اضافه کرده» به‌جای شوک در صورت‌حساب، به شکست CI تبدیل شود.

## `navigation()` و `prefetch()`: به تعویق انداختن کار تا مرحلهٔ بعد

افزودن `<Link prefetch>` حالت‌های loading را حذف می‌کند، اما هر لینکِ قابل‌مشاهده هرچه را route مقصد کش کرده بارگیری می‌کند. مثال پست یک صندوق ایمیل است: هر لینک پیام، کل رشتهٔ پیام‌ها را می‌آورد، حتی برای پیامی که کسی باز نمی‌کند.

نسخهٔ 16.4 دو تابع اضافه کرده که کامپوننت با `await` کردن آن‌ها از یک مرحلهٔ زودتر کنار می‌کشد:

```tsx
import { Suspense } from "react";
import { navigation } from "next/cache";

async function Message({ id }: { id: string }) {
    const message = await getMessage(id); // included in the prefetch

    return (
        <>
            <p>{message.subject}</p>
            <Suspense fallback={<Spinner />}>
                <Thread id={id} />
            </Suspense>
        </>
    );
}

async function Thread({ id }: { id: string }) {
    await navigation(); // skipped during prefetch, runs on real navigation
    const thread = await getThread(id);
    // ...
}
```

`await navigation()` محتوا را تا زمان ناوبری واقعی کاربر از prefetch بیرون نگه می‌دارد. `await prefetch()` کار مشابهی را یک مرحله زودتر انجام می‌دهد: محتوای کش‌شده را از shell یک route خارج می‌کند تا prefetch صریح انجام شود. بده‌بستان روشن است: prefetch ارزان‌تر و فشار کمتر روی سرور می‌گیرید، و در عوض برای بخش به‌تعویق‌افتاده یک حالت loading قابل‌مشاهده می‌پردازید (به همین دلیل `Suspense` لازم است). از آن برای دُمِ پرهزینه استفاده کنید، نه برای محتوایی که هویت صفحه را می‌سازد.

## ابزارهای عامل‌محور

بخش قابل‌توجهی از این نسخه برای عامل‌های کدنویسی است، که با برنامهٔ اعلام‌شده برای مهاجرت اپ‌های موجود هماهنگ است:

- `next upgrade --agent` نسخهٔ نصب‌شده را بررسی می‌کند، نسخهٔ مقصد را انتخاب می‌کند و راهنمای مهاجرت، codemodها و مراحل راستی‌آزمایی را برای عامل شما آماده می‌کند. دستور مستند‌شده `npx next@canary upgrade --agent=latest` است، یعنی حتی اگر اپ شما قدیمی باشد ابزار ارتقا به‌روز است.
- `experimental.agentUpgrade` هنگام `next dev` و `next build` در صورت وجود ارتقا به شما یا عامل یادآوری می‌کند. سیاست پیش‌فرض `'security'` است (آسیب‌پذیری‌های شناخته‌شدهٔ نسخهٔ شما)، `'latest'` برای نسخه‌های major و minor جدیدتر، و `false` برای خاموش‌کردن.
- `experimental.agentFeedback` به عامل اجازه می‌دهد مشکلات فریم‌ورک را جمع کند و پیش‌نویس گزارش بسازد. طبق پست، خودتان آن‌ها را مرور و ارسال می‌کنید، قرار است کد منبع، لاگ‌ها و رازها حذف شوند، و به فعال‌بودن telemetry نیاز دارد و در CI اجرا نمی‌شود. فقط برای اپ‌های جدیدی که با تنظیمات پیشنهادی ساخته شوند پیش‌فرض روشن است.
- Skillهایی برای مهاجرت به Cache Components و Partial Prefetching، به‌علاوهٔ یک skill آزمایشی به نام `next-bundle-optimizer` برای bundle analyzer.

فعال‌کردن کانال بازخورد یک تصمیم سیاستی برای تیم شماست. برای اپ‌های موجود پیش‌فرض خاموش است و پیشنهاد من این است که تا وقتی کسی محتوای واقعی یک پیش‌نویس را نخوانده، همان‌طور بماند.

## بهبودهایی برای همهٔ اپ‌ها

این‌ها پیکربندی نمی‌خواهند:

- کش دیسکی Turbopack بین ۲۰ تا ۲۵ درصد کوچک‌تر شده است؛ بخش عمدهٔ داده با Zstandard فشرده می‌شود و فراداده روی LZ4 می‌ماند.
- HMR تنبل سمت سرور: تغییر ماژول مشترک سرور فقط برای routeهایی اعمال می‌شود که درخواستی واقعاً به آن‌ها نیاز دارد، نه برای همهٔ صفحاتی که پیش‌تر در نشست دیده‌اید.
- یک chunk مشترک برای runtime ی Turbopack در همهٔ routeها، برای دانلود کوچک‌تر و نرخ برخورد بهتر کش.
- نام کلاس‌های CSS Module در production کوتاه‌تر شده و export mangling نام‌های داخلی exportهای جاوااسکریپت را کوتاه می‌کند. در توسعه نام‌های بلند می‌مانند.
- React 19.3 که طبق پست View Transitions پایدار، Fragment Refs و API جدید `browser()` را می‌آورد.

نام‌های کوتاه‌تر کلاس در production می‌توانند هر چیزی را که به آن‌ها وابسته است بشکنند، مثل سلکتورهای تست end-to-end یا کلاس‌هایی که با رشته ساخته می‌شوند. برای تست از attributeهای پایدار استفاده کنید.

## گزینه‌های آزمایشی قابل امتحان

همهٔ این‌ها زیر `experimental` هستند و ممکن است تغییر کنند:

```ts
const nextConfig: NextConfig = {
    reactCompiler: true,
    experimental: {
        turbopackRustReactCompiler: true,
        turbopackGc: true,
        turbopackLazyDynamicImports: true,
        turbopackPluginRuntimeStrategy: "workerThreads",
        turbopackAdditionalRoots: {
            linkedPackages: { path: path.join(__dirname, "../packages") },
        },
    },
};
```

- `turbopackRustReactCompiler` کامپایلر React را به‌جای Babel درون خود Next.js اجرا می‌کند. نسخهٔ 16.4 یک بررسی سریع برای رد کردن فایل‌هایی که بهینه‌سازی نمی‌خواهند اضافه کرده است. تیم Turbopack کاهش ۳۰ درصدی مصرف حافظه و ۱۵ درصدی زمان کامپایل را گزارش می‌کند؛ عددی از خود سازنده، بدون ذکر حجم کار.
- `turbopackGc` کار کامپایل بی‌استفاده را از حافظه و دیسک پاک می‌کند، از جمله دادهٔ کهنهٔ نشست‌های قبلی.
- `turbopackLazyDynamicImports` هدف‌های `import()` سمت کلاینت را فقط وقتی مرورگر درخواست کند کامپایل می‌کند. بعضی importهای `next/dynamic` همچنان زودهنگام کامپایل می‌شوند.
- `turbopackPluginRuntimeStrategy: "workerThreads"` ابزارهایی مثل Babel، PostCSS و loaderهای webpack را در یک پردازش اجرا می‌کند. روی Node.js نسخهٔ 24.13.1 و بالاتر فعلاً به‌دلیل یک باگ Node.js به child process برمی‌گردد.
- `turbopackAdditionalRoots` به Turbopack اجازه می‌دهد وابستگی‌های symlink شده بیرون از ریشهٔ پروژه را دنبال کند. این همان مسیر دستی برای global virtual store ی pnpm است: مسیر خروجی `pnpm store path` را به‌عنوان root اضافه کنید. یکپارچگی خودکار برنامه‌ریزی شده، نه منتشرشده.

Turbopack Bundle Analyzer هم خلاصهٔ routeها، نمای جدول قابل مرتب‌سازی، snapshot با قابلیت diff در طول زمان و تمایز ماژول‌های روی مسیر بحرانی رندر را گرفته است.

## چه باید کرد

1. پروژهٔ جدید: کاری لازم نیست، Cache Components روشن است. `ensureStatic` را زود به routeهای محتوایی اضافه کنید.
2. اپ موجود: `cacheComponents` را عجولانه روشن نکنید. `next upgrade --agent` را روی یک branch اجرا کنید، diff را بخوانید و مهاجرت را تغییر مدل رندر بدانید نه صرفاً ارتقای نسخه. پیش‌فرض‌شدنش در Next.js 17 مهلتی است که باید با آن برنامه‌ریزی کرد.
3. اگر زیاد از `<Link prefetch>` استفاده می‌کنید، ببینید هر route مقصد چه چیزی می‌آورد و دُمِ پرهزینه را پشت `await navigation()` ببرید.
4. سلکتورهای CI را با نام‌های کوتاه‌شدهٔ کلاس CSS Module در production بسنجید.

نکتهٔ احتیاطی این است که پست روایت خود فروشنده از آماده‌شدن مدل است. تضمین‌های هزینه معقول به نظر می‌رسند، اما پیش از متعهد شدن به مهاجرت، با بررسی بخش‌های استاتیک هر صفحه در build production روی routeهای خودتان راستی‌آزمایی کنید.

## منابع

- [Next.js 16.4](https://nextjs.org/blog/next-16-4)
- [Next.js blog index](https://nextjs.org/blog)
