---
title: "نکته‌ی Next.js: notFound() را قبل از مرز Suspense اجرا کنید، وگرنه 404 شما با کد 200 ارسال می‌شود"
description: "وقتی fallback یک Suspense استریم شد، وضعیت HTTP روی 200 قفل می‌شود. بررسی وجود صفحه را قبل از مرز بگذارید یا از Proxy استفاده کنید تا 404 واقعی برگردد."
date: 2026-11-16
cover: /images/blog/2026-11-16-nextjs-streaming-status-codes.svg
tags: [next.js, pro-tip, seo]
draft: false
---

استریم کردن راه پیش‌فرض برای سریع نشان دادن یک صفحه‌ی کند است: اول shell فرستاده می‌شود و بقیه با رسیدن داده پر می‌شود. هزینه‌اش راحت از نظر پنهان می‌ماند. هدرها همراه اولین chunk می‌روند، پس کد وضعیت پیش از رندر شدن بیشتر صفحه تعیین می‌شود. `notFound()` ای که بعداً اجرا شود دیگر نمی‌تواند پاسخ را به 404 تبدیل کند.

این مطلب رفتار را با مستندات فعلی Next.js تطبیق می‌دهد: [راهنمای Streaming](https://nextjs.org/docs/app/guides/streaming) و [مرجع `loading.js`](https://nextjs.org/docs/app/api-reference/file-conventions/loading)، هر دو با آخرین به‌روزرسانی ۲۰۲۶-۱۱-۰۶.

## اشتباه رایج

یک route پویا که محتوا را داخل مرز Suspense می‌گیرد و از همان‌جا `notFound()` صدا می‌زند:

```tsx title="app/post/[slug]/page.tsx"
import { Suspense } from "react";
import { PostContent } from "./post-content";

export default async function PostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  return (
    <Suspense fallback={<p>Loading post...</p>}>
      {/* PostContent fetches the post and calls notFound() if it is missing */}
      <PostContent slug={slug} />
    </Suspense>
  );
}
```

برای slug ای که وجود ندارد، مرورگر UI صفحه‌ی not-found را نشان می‌دهد و تست دستی درست به نظر می‌رسد. اما پاسخِ زیرین داستان دیگری دارد.

## چرا این‌طور می‌شود

راهنمای streaming محدودیت را صریح می‌گوید: وقتی استریم شروع شد، کد وضعیت و هدرها فرستاده شده‌اند و دیگر تغییر نمی‌کنند. رندر شدن یک fallback از Suspense، یا suspend شدن یک کامپوننت زیر یک مرز، استریم را شروع می‌کند و پاسخ همان‌جا به `200 OK` متعهد می‌شود.

Next.js به‌جای تغییر وضعیت این کارها را می‌کند:

- `notFound()` ای که وسط استریم اجرا شود UI صفحه‌ی not-found را رندر می‌کند و `<meta name="robots" content="noindex">` را داخل HTML استریم‌شده می‌گذارد تا موتورهای جست‌وجو آن URL را ایندکس نکنند.
- `redirect()` وسط استریم به ریدایرکت سمت کلاینت تبدیل می‌شود، نه هدر ریدایرکت HTTP.
- خطایی که بعد از شروع استریم پرتاب شود را نزدیک‌ترین مرز `error.js` می‌گیرد و فقط بخش خراب را عوض می‌کند. وضعیت همچنان `200` می‌ماند.

مستندات هم می‌گویند بعضی خزنده‌ها ممکن است این پاسخ‌ها را «soft 404» برچسب بزنند و تگ `noindex` آن‌ها را از نتایج جست‌وجو دور نگه می‌دارد. پس ایندکس شدن عمدتاً محافظت شده است. چیزی که از دست می‌دهید کد وضعیت درست برای هر چیزی است که کد وضعیت را می‌خواند: مانیتورهای uptime، لینک‌چکرها، آنالیتیکس، قوانین کش CDN، مصرف‌کننده‌های API و الزامات compliance.

## راه‌حل: قبل از مرز بررسی کنید

یک بررسی ارزان برای وجود داشتن انجام دهید و پیش از رندر شدن هر fallback، `notFound()` را صدا بزنید:

```tsx title="app/post/[slug]/page.tsx"
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { PostContent } from "./post-content";

export default async function PostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const exists = await checkSlugExists(slug); // fast existence check
  if (!exists) notFound(); // 404 before streaming starts

  return (
    <Suspense fallback={<p>Loading post...</p>}>
      <PostContent slug={slug} />
    </Suspense>
  );
}
```

این همان الگویی است که راهنما نشان می‌دهد. قاعده‌ای که پشتش است: بدون Cache Components، اگر نه `loading.js` و نه `<Suspense>` پاسخ را شروع نکرده باشند، Next.js هنوز می‌تواند هنگام اجرای interrupt مربوطه `404`، `403` یا `401` برگرداند.

بررسی باید سریع باشد. حالا اولین بایت را مسدود می‌کند، یعنی دقیقاً همان هزینه‌ای که استریم قرار بود حذف کند. slug را در یک ایندکس جست‌وجو کنید، نه کل مقاله را.

## مراقب `loading.js` باشید

`loading.js` یک مرز Suspense است که خودتان ننوشته‌اید. طبق مرجع، `page.js`، `not-found.js` و layoutهای تودرتوی همان segment را در بر می‌گیرد. اضافه کردن آن کنار صفحه‌ی بالا یعنی fallback پیش از رسیدن تابع صفحه به `notFound()` رندر می‌شود و وضعیت دوباره `200` می‌شود. پس گذاشتن یک `loading.js` می‌تواند بی‌صدا رفتار وضعیت را برای همه‌ی routeهای پویای زیرش عوض کند.

نکته‌ی مرتبط از همان صفحه: layout ای که داده‌ی کش‌نشده یا runtime مثل `cookies()` یا `headers()` می‌خواند، به `loading.js` همان segment fallback نمی‌کند. بدون Cache Components، ناوبری تا پایان رندر layout مسدود می‌ماند. با Cache Components یک خطای زمان build می‌گیرید که از شما `<Suspense>` می‌خواهد. مستندات توصیه می‌کنند `<Suspense>` را نزدیک محل دسترسی به داده‌ی runtime بگذارید و به یک `loading.js` بالادستی تکیه نکنید.

## با Cache Components اول shell می‌رود

با فعال بودن Cache Components قاعده فرق می‌کند. Next.js اول shell پیش‌رندرشده را می‌فرستد، همراه هدرهایی که CSS، فونت و تصویر را preload می‌کنند. فرستادن shell پاسخ را با `200` شروع می‌کند، حتی اگر shell هیچ UI قابل‌دیدنی نداشته باشد و حتی اگر route مقدار `instant = false` داشته باشد.

بررسی در زمان درخواست داخل صفحه بعد از آن اجرا می‌شود، پس وضعیت `200` می‌ماند، هرچند `notFound()` باز هم UI صفحه‌ی not-found را رندر می‌کند و `noindex` اضافه می‌کند. مستندات می‌گویند یک interrupt فقط وقتی وضعیتش را حفظ می‌کند که در زمان prerender، پیش از شروع پاسخ، اجرا شود.

برای یک 404 واقعی در زمان درخواست در این حالت از [Proxy](https://nextjs.org/docs/app/api-reference/file-conventions/proxy) استفاده کنید. پیش از رندر صفحه اجرا می‌شود و می‌تواند ریدایرکت، rewrite یا یک پاسخ مستقیم برگرداند. مرجع loading پیشنهاد می‌کند slug را همان‌جا بررسی کنید و سپس به یک route از نوع not-found rewrite کنید یا پاسخ 404 برگردانید، و بررسی را سبک نگه دارید: در Proxy کل محتوا را fetch نکنید. ریدایرکت‌های `next.config.js` هم پیش از رندر اجرا می‌شوند.

برای API فعلی [مرجع Proxy](https://nextjs.org/docs/app/api-reference/file-conventions/proxy) را ببینید؛ این مطلب فقط به رفتاری تکیه دارد که مستندات streaming توصیف می‌کنند.

## بات‌ها پاسخ کاملاً متفاوتی می‌گیرند

یک نکته‌ی دیگر که برای تست SEO مهم است. بات‌ها و خزنده‌ها با مرورگرها فرق دارند: بات‌های HTML-limited مثل Twitterbot قبل از استریم صفحه `generateMetadata` را resolve شده می‌گیرند تا metadata در `<head>` اولیه باشد. راهنمای streaming نشان می‌دهد درخواستی با user agent بات تا پایان رندر کامل مسدود می‌ماند و سپس یک سند واحد تحویل می‌دهد. اگر کد وضعیت را با `curl` دیباگ می‌کنید، یادتان باشد نتیجه ممکن است با چیزی که مرورگر می‌بیند یکی نباشد و برای زمان‌بندی chunkها از اسکریپتی استفاده کنید که استریم را بخواند.

## بده‌بستان‌ها

- **بررسی پیش از مرز:** کد وضعیت درست، ولی تأخیر پیش از اولین بایت اضافه می‌کند. برای routeهایی که محتوای ناموجود زیاد است (slugهای تایپ‌شده، آیتم‌های منقضی) می‌ارزد.
- **Proxy:** ارزان‌ترین جا برای یک 404 قطعی، اما یک جست‌وجوی دوم اضافه می‌کند و یک جای دیگر که باید با لایه‌ی داده هماهنگ بماند.
- **کاری نکردن:** وقتی `noindex` کافی است و کسی پایین‌دست کد وضعیت را نمی‌خواند قابل‌قبول است. برای سایتی با نیازهای واقعی SEO یا مانیتورینگ معمولاً نیست.

الگوی اولیه وقتی هنوز مناسب است که تصمیم not-found واقعاً به داده‌ی کند بستگی دارد و `200` را می‌پذیرید. فقط این تصمیم را آگاهانه بگیرید.

## منابع

- https://nextjs.org/docs/app/guides/streaming
- https://nextjs.org/docs/app/api-reference/file-conventions/loading
- https://nextjs.org/docs/app/getting-started/fetching-data
