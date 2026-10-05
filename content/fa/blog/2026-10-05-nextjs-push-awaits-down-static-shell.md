---
title: "نکتهٔ حرفه‌ای Next.js: await مربوط به params و cookies() را پایین‌تر ببرید تا static shell بزرگ بماند"
description: "در Cache Components جای await روی params، cookies() یا fetch تعیین می‌کند چه مقدار از مسیر پیش‌رندر شود. await را زیر Suspense ببرید و با آرگومان کش کنید."
date: 2026-10-05
cover: /images/blog/2026-10-05-nextjs-push-awaits-down-static-shell.svg
tags: [next.js, pro-tip, caching]
draft: true
---

در ۷۲ ساعت گذشته چیز مهمی منتشر نشد که قبلاً پوشش نداده باشیم، پس امروز یک نکتهٔ حرفه‌ای داریم و این بار نوبت Next.js است. همهٔ مطالب زیر با مستندات فعلی Next.js 16.3.x دربارهٔ [caching](https://nextjs.org/docs/app/getting-started/caching) و [`use cache`](https://nextjs.org/docs/app/api-reference/directives/use-cache) تطبیق داده شده است.

نکته: در Cache Components **عمقی که در آن روی داده‌های زمان درخواست `await` می‌کنید تعیین می‌کند چه مقدار از مسیر پیش‌رندر می‌شود**. اگر `params`، `cookies()` یا یک `fetch` بدون کش را در بالای یک layout با `await` بخوانید، کل زیردرخت کارِ زمان درخواست می‌شود. همان `await` را سه کامپوننت پایین‌تر انجام دهید، بقیه در static shell می‌ماند.

## آماده‌سازی

Cache Components به‌صورت اختیاری فعال می‌شود:

```ts
// next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
};

export default nextConfig;
```

با فعال بودن آن، پیش‌رندر مدل پیش‌فرض است. طبق مستندات، هر کامپوننت در یکی از چند دسته می‌افتد:

- محاسبهٔ خالص، importهای ماژول و I/O همگام در زمان build کامل می‌شوند و خودکار وارد shell می‌شوند.
- نتیجهٔ `use cache` وارد shell می‌شود، به شرط آنکه طول عمرش بیش از حد کوتاه نباشد.
- کار async بدون کش و APIهای زمان درخواست (`cookies`، `headers`، `searchParams` و `params` پویا) باید پشت `<Suspense>` باشند. fallback وارد shell می‌شود و محتوا در زمان درخواست استریم می‌شود.
- فراخوانی‌های غیرقطعی مثل `Math.random()`، `Date.now()` یا `crypto.randomUUID()` یا `connection()` به‌علاوهٔ `<Suspense>` می‌خواهند یا `use cache`.

طبق مستندات، وقتی چیزی در پیش‌رندر کامل نمی‌شود و نه boundary دارد نه کش، Next.js یک insight اعتبارسنجی (insight با عنوان «blocking route» در dev overlay) نشان می‌دهد. این همان علامتی است که این نکته به آن مربوط است.

## اشتباه رایج

یک layout که param پویا را در بالا می‌خواند:

```tsx
// app/shop/[slug]/layout.tsx
export default async function Layout({
  children,
  params,
}: LayoutProps<"/shop/[slug]">) {
  const { slug } = await params;

  return (
    <div>
      <Sidebar />
      <h1>{slug}</h1>
      {children}
    </div>
  );
}
```

اگر `slug` را `generateStaticParams` تأمین نکند، داده‌ای زمان درخواست است. چون خود layout آن را `await` می‌کند، layout پیش‌رندر نمی‌شود و `Sidebar` هم که ربطی به param ندارد، پیش‌رندر نمی‌شود. مستندات دقیقاً همین مثال را آورده‌اند.

## راه‌حل

layout را async نکنید. promise را پایین بدهید، یا داخل یک boundary با `.then()` بخوانید:

```tsx
import { Suspense } from "react";

export default function Layout({
  children,
  params,
}: LayoutProps<"/shop/[slug]">) {
  return (
    <div>
      <Sidebar />
      <Suspense fallback={<h1>Loading...</h1>}>
        {params.then(({ slug }) => (
          <SlugHeading slug={slug} />
        ))}
      </Suspense>
      {children}
    </div>
  );
}

function SlugHeading({ slug }: { slug: string }) {
  return <h1>{slug}</h1>;
}
```

حالا `Sidebar`، `children` و fallback بخشی از shell هستند و فقط `SlugHeading` استریم می‌شود. مستندات تصریح می‌کند که همین اصل برای `cookies()`، `headers()`، `searchParams` و واکشی داده هم صادق است.

## سپس بر اساس آرگومان کش کنید

وقتی خواندن به پایین درخت رفت، می‌توانید به بخش گران هم طول عمر بدهید. یک scope از نوع `use cache` نمی‌تواند خودش `cookies()` یا `headers()` را صدا بزند و این محدودیت به helperهایی که صدا می‌زند هم می‌رسد. الگوی ترجیحی مستندات این است که مقدار زمان درخواست را بیرون بخوانید و به‌عنوان آرگومان بدهید:

```tsx
import { cookies } from "next/headers";
import { Suspense } from "react";
import { cacheLife } from "next/cache";

export default function Page() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ProfileContent />
    </Suspense>
  );
}

async function ProfileContent() {
  const session = (await cookies()).get("session")?.value;
  return <CachedContent sessionId={session} />;
}

async function CachedContent({ sessionId }: { sessionId?: string }) {
  "use cache";
  cacheLife("minutes");
  const data = await fetchUserData(sessionId);
  return <div>{data}</div>;
}
```

آرگومان‌ها و متغیرهای capture‌شده از scope بیرونی جزو کلید کش می‌شوند، پس هر `sessionId` ورودی جداگانه دارد. تعیین صریح `cacheLife` توصیه می‌شود؛ بدون آن پروفایل `default` اعمال می‌شود (stale پنج دقیقه در کلاینت، revalidate پانزده دقیقه در سرور، بدون انقضای زمانی).

## بده‌بستان‌ها و نکات احتیاط

- **در serverless ممکن است کش hit نشود.** محل ذخیرهٔ پیش‌فرض حافظهٔ درون‌فرایندی است. در serverless ورودی‌ها معمولاً بین درخواست‌ها نمی‌مانند و تابع کش‌شده ممکن است دوباره اجرا شود. Node خودمیزبان ورودی‌ها را نگه می‌دارد و `cacheMaxMemorySize` اندازه را محدود می‌کند. `use cache: remote` handler مشترک می‌دهد، به قیمت یک رفت‌وبرگشت شبکه و معمولاً هزینهٔ پلتفرم. مستندات می‌گوید فقط در نرخ hit بالا می‌ارزد.
- **کامپوننت کش‌شده به‌ازای هر session در static shell نیست.** پشت داده‌های درخواست قرار دارد. چیزی که به دست می‌آورید مسیر prefetch است: با فعال بودن Partial Prefetching، طول عمر باعث می‌شود نتیجه وارد prefetch شود.
- **دادن promise به تابع کش‌شده می‌تواند build را قفل کند.** اگر `cookies()` (خود promise) یا promiseهای زمان درخواست دیگر را به‌صورت props به تابع `use cache` بدهید، پیش‌رندر تا timeout پنجاه‌ثانیه‌ای منتظر می‌ماند. بیرون `await` کنید و مقدار را بدهید. مستندات همین خرابی را برای promiseهایی که در یک `Map` مشترک نگه‌داری شوند هم نشان می‌دهد.
- **`React.cache` از مرز عبور نمی‌کند.** داخل `use cache` scope جداگانه دارد، پس مقدارهای بیرونی دیده نمی‌شوند. از آرگومان استفاده کنید.
- **ورودی‌های کش با deploy جدید نمی‌مانند.** شناسهٔ build (یا `deploymentId`) در کلید است.
- **ربات‌ها رندر کامل پویا می‌گیرند.** طبق مستندات، خزنده‌ها shell را رد می‌کنند و HTML کامل رندرشده در زمان درخواست می‌گیرند؛ پس هر چیز در shell که به ورودی‌های فقط-build وابسته است باید در زمان درخواست هم کار کند.
- **APIهای درخواست در کد کش‌شده می‌توانند از `next build` رد شوند و بعداً خطا بدهند** در مسیرهای پویا، چون خطا وقتی مسیر اجرا شود پدیدار می‌شود.

## وقتی الگوی اولیه اشکالی ندارد

اگر layout سبک است، همزادهای کمی دارد، یا مسیر ذاتاً پویاست، `await` در بالا هزینهٔ کمی دارد و شکستن آن فقط لایهٔ غیرمستقیم اضافه می‌کند. بازآرایی وقتی می‌ارزد که مقدار منتظرشده را بخش کوچکی از یک زیردرخت بزرگ استفاده کند. داده‌های قابل‌پیش‌بینی، مثل فایل پیکربندی که تغییر نمی‌کند، به هیچ‌یک از این‌ها نیاز ندارد: در سطح ماژول بخوانیدش تا خودش پیش‌رندر شود.

## چک‌لیست سریع

1. `cacheComponents` را روشن کنید و dev overlay را روی سنگین‌ترین مسیر باز کنید.
2. برای هر insight از نوع blocking-route، کم‌عمق‌ترین `await` روی داده‌های زمان درخواست را پیدا کنید.
3. آن را به کوچک‌ترین کامپوننتی که به مقدار نیاز دارد، پشت `<Suspense>` ببرید.
4. اگر آن کامپوننت گران است و مقدار ورودی‌های متمایز کمی دارد، مقدار را بیرون بکشید و به تابع `use cache` با `cacheLife` صریح بدهید.

## منابع

- [Next.js docs: Caching](https://nextjs.org/docs/app/getting-started/caching)
- [Next.js docs: use cache](https://nextjs.org/docs/app/api-reference/directives/use-cache)
