---
title: "نکته‌ی Next.js: مقدار cookies() را بیرون از 'use cache' بخوانید و به‌عنوان آرگومان بدهید"
description: "داخل scope کش‌شده نمی‌شود cookies() یا headers() را صدا زد. مقدار را بیرون بخوانید و آرگومان بدهید تا جزو کلید کش شود؛ و بدانید هنگ build و serverless یعنی چه."
date: 2026-11-14
cover: /images/blog/2026-11-14-nextjs-use-cache-runtime-args.svg
tags: [next.js, pro-tip, caching]
draft: false
---

وقتی Cache Components روشن است، `'use cache'` راه اصلی برای دادن طول عمر به داده است. اشتباهی که مدام تکرار می‌شود این است که تابع کش‌شده را به درخواست وابسته کنیم: خواندن `cookies()` داخل آن، یا رد کردن یک promise که از درخواست آمده. هر دو شکست می‌خورند، به دو شکل متفاوت، و یکی‌شان دیر شکست می‌خورد.

این مطلب با راهنمای فعلی [Caching](https://nextjs.org/docs/app/getting-started/caching) و مرجع [`use cache`](https://nextjs.org/docs/app/api-reference/directives/use-cache) (آخرین به‌روزرسانی ۲۰۲۶-۱۱-۰۶) تطبیق داده شده است. همه‌چیز فرض می‌کند `cacheComponents: true` در `next.config.ts` تنظیم شده است.

## الگوی مشکل‌دار

```tsx
// lib/prefs.ts
import { cookies } from "next/headers";
import { cacheLife } from "next/cache";

export async function getPrefs() {
    "use cache";
    cacheLife("hours");

    const session = (await cookies()).get("session")?.value; // not allowed here
    return db.prefs.find({ session });
}
```

مرجع صریح است: تابع‌ها و کامپوننت‌های کش‌شده نمی‌توانند به runtime APIهایی مثل `cookies()`، `headers()` یا `searchParams` دسترسی داشته باشند و این محدودیت در کل call stack ادامه دارد. تابع کمکی‌ای که تابع کش‌شده صدا می‌زند و یکی از این‌ها را می‌خواند، با همان خطای `next-request-in-use-cache` شکست می‌خورد.

نکته‌ی قابل‌یادآوری این است که خطا کی رخ می‌دهد. مستندات می‌گوید در مسیری که به‌صورت dynamic رندر می‌شود، خطا وقتی ظاهر می‌شود که مسیر اجرا شود؛ پس ممکن است `next build` سالم تمام شود و بعد زیر `next start` خطا بدهد. build سبز دلیل پاک بودن scope کش‌شده نیست.

## راه‌حل: بیرون بخوانید، مقدار را به داخل بدهید

```tsx
// app/profile/page.tsx
import { cookies } from "next/headers";
import { Suspense } from "react";

export default function Page() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <ProfileContent />
        </Suspense>
    );
}

// not cached: reads runtime data
async function ProfileContent() {
    const session = (await cookies()).get("session")?.value;
    if (!session) return <p>Signed out</p>;
    return <CachedPrefs sessionId={session} />;
}

// cached: receives the extracted value as a prop
async function CachedPrefs({ sessionId }: { sessionId: string }) {
    "use cache";
    cacheLife("hours");
    const prefs = await db.prefs.find({ session: sessionId });
    return <pre>{JSON.stringify(prefs)}</pre>;
}
```

(بالای فایل `import { cacheLife } from "next/cache"` را هم اضافه کنید.) مستندات این را الگوی ترجیحی می‌نامد. سه چیز باعث می‌شود کار کند:

- **کامپوننت کش‌نشده خواندن runtime را بر عهده دارد** و داخل `<Suspense>` است. دسترسی به runtime API بدون boundary در dev overlay هشدار blocking-route می‌دهد. بقیه‌ی صفحه، از جمله محتوای کش‌شده یا استاتیک، همچنان در static shell ارسال می‌شود.
- **آرگومان‌ها جزو کلید کش می‌شوند.** کلید از build ID، یک hash از مکان و امضای تابع، و آرگومان‌ها یا propهای قابل‌سریال‌سازی ساخته می‌شود. مقدارهای متفاوت `sessionId` ورودی جداگانه می‌گیرند. متغیرهای گرفته‌شده از scope بیرونی هم به‌عنوان آرگومان bind می‌شوند، پس closure هم از کلید فرار نمی‌کند.
- **مقدار باید قابل‌سریال‌سازی باشد.** primitiveها، آبجکت‌های ساده، آرایه، تاریخ، map و set مشکلی ندارند. نمونه‌ی کلاس، symbol و `URL` نمی‌شوند.

## شکست آرام‌تر: build که هنگ می‌کند

دادن خود نتیجه‌ی `cookies()` بدون await مرتب به نظر می‌رسد و کامپایل هم می‌شود:

```tsx
async function Dynamic() {
    const cookieStore = cookies();
    return <Cached promise={cookieStore} />; // build hangs
}

async function Cached({ promise }: { promise: Promise<unknown> }) {
    "use cache";
    const data = await promise; // waits for runtime data during prerender
    return <p>{String(data)}</p>;
}
```

تابع کش‌شده منتظر مقداری می‌ماند که در prerender وجود ندارد. مستندات می‌گوید build پس از ۵۰ ثانیه با پیام «Filling a cache during prerender timed out» تایم‌اوت می‌شود و همین تله را با promiseهای وابسته به درخواست که از closure یا یک `Map` مشترک می‌رسند هم فهرست می‌کند. قاعده همان است: مقدار runtime را بیرون await کنید و مقدار ساده را به داخل بدهید.

## کش در runtime واقعاً چقدر می‌ارزد

این همان بده‌بستانی است که معمولاً نادیده گرفته می‌شود. راهنمای Caching اشاره می‌کند کامپوننت کش‌شده‌ای که پشت داده‌ی درخواست قرار دارد، مثل `CachedPrefs` بالا، به static shell اضافه نمی‌شود. در runtime در ذخیره‌ساز in-memory پیش‌فرض می‌ماند و مرجع پیامدش را به تفکیک محیط می‌گوید:

| محیط | رفتار runtime با handler پیش‌فرض |
| --- | --- |
| Self-hosted | ورودی‌ها بین درخواست‌ها می‌مانند؛ اندازه با `cacheMaxMemorySize` کنترل می‌شود. |
| Serverless | ورودی‌ها معمولاً بین درخواست‌ها نمی‌مانند، پس تابع ممکن است هر بار دوباره اجرا شود. |

پس کش per-session با `'use cache'` روی سرور Node پایدار برد واقعی است و روی serverless شاید هیچ سودی نداشته باشد. اگر ورودی‌های ماندگار و مشترک می‌خواهید، مستندات به `'use cache: remote'` اشاره می‌کند که به cache handler در پلتفرم شما نیاز دارد. این گزینه یک رفت‌وبرگشت شبکه‌ای برای بررسی کش اضافه می‌کند و معمولاً هزینه‌ی پلتفرم دارد، و مستندات می‌گوید فقط با hit rate بالا می‌ارزد. یادتان باشد هیچ‌کدام از این ذخیره‌سازها از deploy جدید جان سالم به در نمی‌برند، چون build ID (یا `deploymentId`) در کلید است.

یک سود دوم هم هست که به حافظه‌ی سرور بستگی ندارد. با Partial Prefetching، فراخوانی `use cache` که با مقادیر استخراج‌شده از runtime APIها تغذیه می‌شود، به prefetch هر لینک می‌پیوندد. طول عمری که تعیین می‌کنید باعث می‌شود کلاینت نتیجه را در بازه‌ی `stale` تازه بداند، حتی اگر ورودی‌های سمت سرور به‌ندرت بین درخواست‌ها بمانند.

## کی `use cache: private` درست است

مستندات [`'use cache: private'`](https://nextjs.org/docs/app/api-reference/directives/use-cache-private) را برای حالتی کنار می‌گذارد که مجبورید داده‌ی runtime را مستقیم داخل scope کش‌شده بخوانید: الزامات compliance، یا کدی که نمی‌توانید برای گرفتن آرگومان refactor کنید. نتایجش فقط در مرورگر و به‌عنوان بخشی از prefetch می‌مانند. این استثناست، نه پیش‌فرض. اگر می‌توانید فراخوانی `cookies()` را یک تابع بالاتر ببرید، همان را بکنید.

## دو قاعده‌ی کوچک‌تر از همین صفحه‌ها

- **آنچه لازم ندارید نخوانید.** `session.id` را بدهید، نه کل cookie store یا کل آبجکت session را. آرگومان باریک‌تر یعنی ورودی کمتر و بدون تغییر ناخواسته‌ی کلید از فیلدهای بی‌ربط.
- **همیشه دایرکتیو را با `cacheLife` جفت کنید.** بدون آن پروفایل ضمنی `default` اعمال می‌شود: ۵ دقیقه stale در کلاینت، ۱۵ دقیقه تا revalidate در سرور، و بدون انقضای زمانی. برای داده‌ی هر کاربر به‌ندرت همین را می‌خواهید.

## چک‌لیست

1. در فایل‌های کش‌شده دنبال `cookies(`، `headers(` و `searchParams` بگردید. هر نتیجه باگی است که منتظر runtime مانده.
2. خواندن را به کامپوننت کش‌نشده زیر `<Suspense>` ببرید، `await` کنید و مقدار را پایین بدهید.
3. هرگز promise بدون await را پاس ندهید.
4. بررسی کنید مدل hosting اصلاً کش runtime به شما می‌دهد یا نه. اگر نه، سود در static shell و prefetch است، نه استفاده‌ی مجدد در هر درخواست.
5. با `next start` تست کنید، نه فقط `next build`.

## منابع

- [Next.js docs: Caching](https://nextjs.org/docs/app/getting-started/caching)
- [Next.js docs: use cache](https://nextjs.org/docs/app/api-reference/directives/use-cache)
