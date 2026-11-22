---
title: "نکتهٔ حرفه‌ای Next.js: با Cache Components، تابع generateStaticParams یک مجموعه تست زمان build است، پس نمونه‌های واقعی به آن بدهید"
description: "با Cache Components، generateStaticParams خالی build را می‌شکند. نمونه‌ها مسیر را اعتبارسنجی می‌کنند، ولی شاخه‌هایی که نمونه‌ها نمی‌روند در اجرا خطا می‌دهند."
date: 2026-11-22
cover: /images/blog/2026-11-22-nextjs-generate-static-params-cache-components.svg
tags: [next.js, pro-tip, caching]
draft: false
---

در ۷۲ ساعت گذشته چیز پایدار و مهمی منتشر نشد که قبلاً پوشش نداده باشیم. Vue هنوز روی release candidateهای 3.6 است ([rc.16 تازه‌ترین است](https://github.com/vuejs/core/releases))، جدیدترین خط Vite یک [بتای 8.4](https://github.com/vitejs/vite/releases) است و بقیه patch هستند. پس امروز یک نکتهٔ حرفه‌ای داریم و چون نکتهٔ قبلی دربارهٔ Nuxt بود، نوبت Next.js است. همهٔ مطالب زیر با [مرجع `generateStaticParams`](https://nextjs.org/docs/app/api-reference/functions/generate-static-params)، [صفحهٔ خطای `generateStaticParams` خالی](https://nextjs.org/docs/messages/empty-generate-static-params) و [مرجع dynamic segments](https://nextjs.org/docs/app/api-reference/file-conventions/dynamic-routes) تطبیق داده شده است.

نکته: **با Cache Components، تابع `generateStaticParams` فقط فهرست صفحه‌های prerender نیست؛ ورودی اعتبارسنجی زمان build برای مسیر شماست. نمونه‌هایی را که برمی‌گردانید مثل test case ببینید و دقیقاً بدانید چه چیزی را پوشش نمی‌دهند.**

## عادتی که می‌شکند

بدون Cache Components، برگرداندن آرایهٔ خالی الگوی مستند و مفیدی است. مرجع می‌گوید با `[]` هر مسیر در اولین بازدید رندر می‌شود و همیشه باید یک آرایه برگردانید، چون در غیر این صورت مسیر به‌صورت dynamic رندر می‌شود.

```tsx
// app/blog/[slug]/page.tsx
export async function generateStaticParams() {
    return []; // "render everything on first visit"
}
```

اگر این عادت را به پروژه‌ای با Cache Components ببرید، build خطا می‌دهد. مستندات می‌گویند آنجا مسیرهای dynamic باید **دست‌کم یک param** برگردانند و آرایهٔ خالی یک [خطای build](https://nextjs.org/docs/messages/empty-generate-static-params) است.

دلیلش سخت‌گیری بی‌دلیل نیست. در زمان build، Next.js مسیر شما را یک بار برای هر نمونه اجرا می‌کند و بررسی می‌کند که هیچ‌چیز داده‌های runtime (`cookies()`، `headers()`، `searchParams`) را بیرون از مرز `<Suspense>` یا scope یک `use cache` نخوانده باشد. بدون نمونه چیزی برای اجرا نیست، پس چیزی هم برای اعتبارسنجی نیست. صفحهٔ خطا هدف را همین می‌داند: اشتباه‌های دسترسی به runtime در build پیدا شوند، نه در production.

## نمونه‌ها چه چیزی می‌خرند

طبق مرجع dynamic segments، رفتار بسته به این است که نمونه بدهید یا نه.

بدون `generateStaticParams`، paramها داده‌های runtime هستند. هر دسترسی به آن‌ها باید زیر یک fallback از Suspense باشد و Next.js یک static shell می‌سازد و محتوا را در هر درخواست پر می‌کند. در layoutها مستندات توصیه می‌کند `params` را در سطح بالا await نکنید، چون جلوی prerender شدن layout را می‌گیرد؛ promise را پایین بدهید و همان‌جا که لازم است await کنید.

با `generateStaticParams`، مسیر در زمان build با هر نمونه اجرا می‌شود، HTML جمع‌آوری می‌شود و اشتباه، build را می‌شکند. صفحه‌های paramهایی که فهرست نکرده‌اید در اولین درخواست رندر می‌شوند و بعد از موفقیت آن درخواست روی دیسک ذخیره می‌شوند.

```tsx
// app/blog/[slug]/page.tsx
export async function generateStaticParams() {
    return [{ slug: "hello-world" }, { slug: "getting-started" }];
}

export default async function Page({ params }: PageProps<"/blog/[slug]">) {
    const { slug } = await params;
    return <Content slug={slug} />;
}

async function Content({ slug }: { slug: string }) {
    const post = await getPost(slug);
    return <article>{post.title}</article>;
}

async function getPost(slug: string) {
    "use cache";
    const res = await fetch(`https://api.example.com/posts/${slug}`);
    return res.json();
}
```

اینجا `getPost` کش می‌شود، `params` از مقدارهای شناخته‌شده resolve می‌شود و build ثابت می‌کند صفحه قابل prerender است. شکل مورد نظر همین است: نمونه‌ها هم صفحه‌های فوری برای مسیرهای محبوب می‌دهند و هم ساختار مسیر را اعتبارسنجی می‌کنند.

## شکاف: شاخه‌هایی که نمونه‌ها هرگز نمی‌روند

اعتبارسنجی زمان build فقط مسیرهای کدی را پوشش می‌دهد که نمونه‌ها واقعاً اجرا می‌کنند. مستندات صریحاً این را می‌گویند و باگ‌های واقعی production همین‌جا هستند.

```tsx
import { cookies } from "next/headers";

export async function generateStaticParams() {
    return [{ slug: "public-post" }, { slug: "hello-world" }];
}

export default async function Page({ params }: PageProps<"/blog/[slug]">) {
    const { slug } = await params;

    if (slug.startsWith("private-")) {
        // never executed at build time
        return <PrivatePost slug={slug} />;
    }
    return <PublicPost slug={slug} />;
}

async function PrivatePost({ slug }: { slug: string }) {
    const token = (await cookies()).get("token");
    // ...
}
```

build موفق می‌شود، چون هیچ‌کدام از دو نمونه وارد شاخهٔ `private-` نمی‌شوند. درخواست برای `/blog/private-notes` در اولین درخواست اعتبارسنجی می‌شود، `cookies()` را بدون مرز Suspense می‌بیند و خطا می‌دهد. slugهای runtime دیگر که از آن شاخه رد می‌شوند درست رندر و ذخیره می‌شوند، پس از بیرون خطا گهگاهی به نظر می‌رسد.

راه‌حل مستند، پیچیدن کامپوننتی است که runtime می‌خواند در Suspense:

```tsx
import { Suspense } from "react";

if (slug.startsWith("private-")) {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <PrivatePost slug={slug} />
        </Suspense>
    );
}
```

قاعدهٔ عملی از این‌جا می‌آید: **برای هر شاخه دست‌کم یک نمونه بگذارید.** اگر صفحه بر اساس پیشوند slug، locale یا نوع محتوا دوشاخه می‌شود، برای هر انشعاب یک param نماینده اضافه کنید. آن‌وقت build آن را اجرا می‌کند و خطا از runtime به شکست CI منتقل می‌شود.

## سراغ placeholder نروید

مستندات یک راه فرار را ذکر می‌کنند برای وقتی که واقعاً هیچ مقداری در زمان build نمی‌دانید: مثلاً `[{ slug: "__placeholder__" }]` را برگردانید و در صفحه برای آن `notFound()` صدا بزنید. همان‌جا هم می‌گویند این هدف را از بین می‌برد، چون فقط یک مسیر کد را اعتبارسنجی می‌کند و paramهای واقعی ممکن است به مسیرهایی برسند که به APIهای dynamic نادرست دسترسی دارند و خطاهایی در runtime بدهند که error boundary نمی‌تواند بگیرد. فقط وقتی راه بهتری ندارید از آن استفاده کنید و ترجیحاً slugهای واقعی را از CMS یا لایهٔ محتوا بگیرید، حتی اگر فهرست را کوتاه کنید.

به‌هرحال کوتاه‌کردن مشکلی ندارد. برگرداندن ده پست برتر هم مجموعهٔ نمونهٔ معتبری است و بقیه در اولین درخواست رندر می‌شوند. فقط هنگام انتخاب آن ده تا قاعدهٔ پوشش شاخه‌ها را در نظر بگیرید.

## جزئیات دیگر

- **`dynamicParams` اعمال نمی‌شود.** مرجع می‌گوید این گزینه فقط بدون Cache Components در دسترس است. اگر برای 404 دادن به slugهای ناشناخته به `export const dynamicParams = false` تکیه کرده‌اید، param را در صفحه اعتبارسنجی کنید و `notFound()` صدا بزنید؛ مستندات dynamic segments برای همین الگوی `assertValidLocale` را نشان می‌دهند.
- **والد به فرزند می‌دهد.** `generateStaticParams` فرزند یک بار برای هر مجموعه param که والد برمی‌گرداند اجرا می‌شود و paramهای والد را synchronous دریافت می‌کند. layout فقط می‌تواند برای segmentهای هم‌سطح یا بالاتر از خودش param بسازد.
- **هنگام revalidation صدا زده نمی‌شود.** در revalidation به سبک ISR، `generateStaticParams` دوباره فراخوانی نمی‌شود و در `next dev` هنگام رفتن به مسیر اجرا می‌شود.
- **Route Handlerها هم.** همین تابع روی `route.ts` هم کار می‌کند و مستندات ترکیبش با `use cache` را برای پاسخ‌های API ایستا نشان می‌دهند.
- **`fetch` memoize می‌شود** بین توابع با پیشوند `generate`، layoutها و صفحه‌ها، پس گرفتن یک فهرست در چند جا در build درخواست‌ها را چندبرابر نمی‌کند. اگر از پایگاه داده می‌خوانید، خواندن را در `cache` ریاکت بپیچید.

## بده‌بستان‌ها

این الزام هزینه دارد. سایت‌هایی که محتوایشان در زمان build کاملاً ناشناخته است یا build به منبع داده دسترسی ندارد، حالا باید نمونه‌ای واقعی بدهند یا به placeholder برگردند و بیشتر اعتبارسنجی را از دست بدهند. زمان build هم با تعداد نمونه‌ها بیشتر می‌شود، چون هر نمونه یک اجرای کامل مسیر است.

در عوض، دستهٔ کاملی از باگ‌های «برای slugهایی که امتحان کردم کار می‌کند ولی در production برای یکی خطا می‌دهد» به شکست build تبدیل می‌شود. برای مسیر پرمحتوا معامله خوبی است. برای مسیری که واقعاً به‌ازای هر درخواست است و نسخهٔ ایستای معناداری ندارد، طراحی بهتر شاید این باشد که `generateStaticParams` را کنار بگذارید و مرزهای Suspense را دور دسترسی به `params` بگذارید، همان‌طور که مستندات برای آن حالت می‌گویند.

## چک‌لیست

1. وقتی Cache Components روشن است، از هر مسیر dynamic، param واقعی برگردانید و هرگز `[]`.
2. برای هر شاخه‌ای که رفتار متفاوت دارد یک نمونه بگذارید.
3. هر چیزی که `cookies()`، `headers()` یا `searchParams` می‌خواند، حتی در شاخه‌هایی که نمونه‌ها نمی‌روند، در Suspense بپیچید.
4. به‌جای `dynamicParams = false` اعتبارسنجی صریح و `notFound()` بگذارید.
5. param از نوع placeholder را بدهی فنی حساب کنید.

## منابع

- [generateStaticParams reference](https://nextjs.org/docs/app/api-reference/functions/generate-static-params)
- [Empty generateStaticParams with Cache Components](https://nextjs.org/docs/messages/empty-generate-static-params)
- [Dynamic Route Segments reference](https://nextjs.org/docs/app/api-reference/file-conventions/dynamic-routes)
- [Vue core releases](https://github.com/vuejs/core/releases)
- [Vite releases](https://github.com/vitejs/vite/releases)
