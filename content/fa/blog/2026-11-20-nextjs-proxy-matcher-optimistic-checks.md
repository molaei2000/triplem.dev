---
title: "نکتهٔ حرفه‌ای Next.js: با proxy.ts مثل یک دروازهٔ خوش‌بینانه رفتار کنید و matcher آن را عمداً محدود کنید"
description: "proxy.ts بدون matcher روی هر درخواست اجرا می‌شود، fetch را کش نمی‌کند و جای بررسی دسترسی نیست. دامنه‌اش را محدود کنید، هدرها را درست پاس بدهید و سبکش نگه دارید."
date: 2026-11-20
cover: /images/blog/2026-11-20-nextjs-proxy-matcher-optimistic-checks.svg
tags: [next.js, pro-tip, security, performance]
draft: false
---

در ۷۲ ساعت گذشته چیز پایدار و مهمی منتشر نشد که قبلاً پوشش نداده باشیم. Vue هنوز روی release candidateهای 3.6 است (rc.15 تازه‌ترین است)، جدیدترین خط Vite یک بتای 8.4 است و بقیه patch release هستند که از آن‌ها می‌گذریم. پس امروز یک نکتهٔ حرفه‌ای داریم و چون نکتهٔ قبلی دربارهٔ Nuxt بود، نوبت Next.js است. همهٔ مطالب زیر با [مرجع proxy.js](https://nextjs.org/docs/app/api-reference/file-conventions/proxy) و [صفحهٔ شروع Proxy](https://nextjs.org/docs/app/getting-started/proxy) تطبیق داده شده است.

نکته: **`proxy.ts` (نام Next.js 16 برای middleware) یک دروازهٔ سریع و خوش‌بینانه جلوی اپ شماست. اگر دامنه‌اش را محدود نکنید برای هر مسیر فراخوانی می‌شود، نمی‌تواند چیزی را که fetch می‌کند کش کند و لایهٔ مجوزدهی نیست.** بیشتر باگ‌های proxy از فراموش‌کردن یکی از همین سه مورد می‌آید.

## اشتباه ۱: نبودن matcher

طبق مستندات، بدون `matcher` ‏Proxy روی هر درخواستی اجرا می‌شود، از جمله `_next/static`، `_next/image` و هر چیز داخل `public/`. پس ریدایرکت احراز هویتی که بدون matcher نوشته شود، برای بازدیدکنندهٔ لاگین‌نکرده CSS و JS و تصاویر را هم ریدایرکت می‌کند.

```ts
// proxy.ts: runs for everything, including static assets
export function proxy(request: NextRequest) {
    if (!request.cookies.has("session")) {
        return NextResponse.redirect(new URL("/login", request.url));
    }
}
```

دامنه را محدود کنید. الگوی negative lookahead در مرجع معمولاً نقطهٔ شروع است:

```ts
export const config = {
    matcher: [
        "/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)",
    ],
};
```

دو نکتهٔ مستندات که باید یادتان بماند. مقدارهای matcher باید ثابت باشند تا در زمان build تحلیل شوند و متغیرها نادیده گرفته می‌شوند. و حتی اگر `_next/data` را در الگوی منفی کنار بگذارید، Proxy باز هم برای آن مسیرها اجرا می‌شود. این عمدی است تا نتوانید صفحه‌ای را محافظت کنید و مسیر داده‌اش را فراموش کنید.

با matcher به‌شکل آبجکت و شرط‌های `has`/`missing` روی هدرهای `next-router-prefetch` و `purpose` می‌توانید prefetchها را هم کنار بگذارید. وقتی بررسی گران است و نباید prefetch هزینه‌اش را بدهد مفید است. ولی با احتیاط: prefetchِ ردشده اصلاً دروازه‌ای ندارد.

## اشتباه ۲: Proxy را لایهٔ احراز هویت دانستن

صفحهٔ شروع صریح است: Proxy برای واکشی داده‌های کند طراحی نشده و برای بررسی‌های خوش‌بینانه مثل ریدایرکت بر اساس دسترسی مناسب است، ولی نباید راه‌حل کامل مدیریت نشست یا مجوزدهی باشد.

الگوی مناسب یک بررسی ارزان و بدون حالت روی کوکی است، و بررسی واقعی همان‌جا که داده خوانده می‌شود:

```ts
// proxy.ts: optimistic: "does a session cookie exist at all?"
export function proxy(request: NextRequest) {
    if (!request.cookies.has("session")) {
        return NextResponse.redirect(new URL("/login", request.url));
    }
}

export const config = { matcher: ["/dashboard/:path*"] };
```

```ts
// lib/dal.ts: authoritative: verify the session and the resource
import "server-only";

export async function getInvoice(id: string) {
    const session = await verifySession(); // signature, expiry, revocation
    const invoice = await db.invoice.findUnique({ where: { id } });
    if (invoice?.ownerId !== session.userId) throw new Error("Forbidden");
    return invoice;
}
```

یک دلیل ساختاری هم هست. در فهرست ترتیب اجرا، Proxy بعد از `headers` و `redirects` در `next.config.js` و قبل از مسیرهای سیستم فایل می‌آید. Server Functionها مسیر جداگانه‌ای در این زنجیره نیستند: آن‌ها درخواست POST به مسیری‌اند که در آن استفاده شده‌اند. matcherای که یک مسیر را کنار بگذارد، فراخوانی‌های Server Function روی آن مسیر را هم رد می‌کند و یک refactor که تابعی را به مسیر دیگری ببرد می‌تواند پوشش را بی‌صدا از بین ببرد. توصیهٔ مستندات این است که احراز هویت و مجوز را داخل هر Server Function بررسی کنید و فقط به Proxy تکیه نکنید. (سمت action را در [نکتهٔ قبلی](/fa/blog/2026-10-20-nextjs-server-action-authz) بررسی کردیم.)

## اشتباه ۳: انتظار کش‌شدن داخل Proxy

دو چیزی که باید کار کنند ولی نمی‌کنند:

- دایرکتیوهای `"use cache"` و `"use server"` در Proxy اثری ندارند، چون Proxy تبدیل دایرکتیو اعمال نمی‌کند.
- گزینه‌های `fetch` مثل `cache`، `next.revalidate` و `next.tags` آنجا پاسخ‌ها را کش نمی‌کنند.

پس جست‌وجوی feature flag یا جدول ریدایرکت در Proxy برای هر درخواستِ منطبق به مبدأ می‌رسد. مستندات به یک کش یا دیتا استور خارجی اشاره می‌کنند، یا انتقال کار به Server Component یا Route Handler. برای فهرست ثابت ریدایرکت‌ها، گزینهٔ `redirects` در `next.config.ts` اولین چیزی است که باید امتحان کنید: قبل از Proxy ارزیابی می‌شود و مستندات آن را برای موارد ساده توصیه می‌کنند.

## اشتباه ۴: پاس‌دادن داده به پایین‌دست به شکل نادرست

Proxy جدا از کد رندر اجرا می‌شود و مستندات هشدار می‌دهند به ماژول‌ها و globalهای مشترک تکیه نکنید. برای رساندن چیزی به اپ از هدر، کوکی، rewrite، redirect یا URL استفاده کنید. شکل هدر یک تله دارد:

```ts
export function proxy(request: NextRequest) {
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set("x-tenant", resolveTenant(request));

    // Correct: visible to your Server Components via headers()
    return NextResponse.next({ request: { headers: requestHeaders } });

    // Wrong: this sends the header to the client instead
    // return NextResponse.next({ headers: requestHeaders });
}
```

هدرها را کوچک نگه دارید؛ مستندات هشدار می‌دهند هدرهای بزرگ بسته به سرور بک‌اند می‌توانند خطای 431 بدهند. همچنین در درخواست‌های RSC، Next.js هدرهای داخلی Flight (یعنی `rsc`، `next-router-state-tree` و `next-router-prefetch`) را از `request.headers` حذف می‌کند، پس نمی‌توانید بر اساس آن‌ها با RSC و HTML رفتار متفاوت داشته باشید. اگر rewrite را با `fetch` خودتان پیاده کنید باید آن هدرها را خودتان پاس بدهید، یا از `NextResponse.rewrite()` استفاده کنید که آن‌ها را منتقل می‌کند. `skipProxyUrlNormalize` برای همین حالت پیشرفته است.

## نکته‌های ارزان دیگر

- **کار پس‌زمینه:** آرگومان دوم، `event`، متد `waitUntil(promise)` دارد که Proxy را بعد از ارسال پاسخ زنده نگه می‌دارد. برای لاگ خوب است و برای چیزی که پیش از پاسخ لازم دارید بد.
- **Runtime:** Proxy به‌طور پیش‌فرض روی Node.js اجرا می‌شود و تنظیم `runtime` در فایل Proxy خطا می‌دهد.
- **تست:** `next/experimental/testing/server` تابع `unstable_doesMiddlewareMatch` را برای assert کردن matcher و `isRewrite`/`getRewrittenUrl` را برای پاسخ دارد. آزمایشی است، ولی رگرسیون matcher دقیقاً چیزی است که باید برایش unit test داشت.
- **مهاجرت:** `npx @next/codemod@canary middleware-to-proxy .` فایل و تابع را تغییر نام می‌دهد.

## مصالحه‌ها

محدودکردن با فهرست مجاز صریح (`/dashboard/:path*`) در برابر گیت‌کردن ناخواستهٔ asset ایمن‌تر است، ولی هر مسیر محافظت‌شدهٔ جدید باید دستی اضافه شود. negative lookahead مسیرهای جدید را پیش‌فرض محافظت می‌کند و نگهداری استثناها با شماست. یکی را آگاهانه انتخاب کنید و کنارش یک تست matcher بگذارید. و بررسی Proxy را خوش‌بینانه نگه دارید: اگر تنها دروازه باشد، فاصله‌اش تا یک مسیر باز فقط یک ویرایش matcher است.

انجام جست‌وجوی واقعی نشست در Proxy فقط در یک حالت محدود منطقی است: بررسی امضای محلی و ارزان روی JWT یا کوکی امضاشده، بدون شبکه. به محض اینکه به پایگاه داده یا فهرست ابطال نیاز پیدا کند، آن منطق به لایهٔ دسترسی به داده تعلق دارد.

## منابع

- [proxy.js file convention (Next.js docs)](https://nextjs.org/docs/app/api-reference/file-conventions/proxy)
- [Proxy getting started (Next.js docs)](https://nextjs.org/docs/app/getting-started/proxy)
- [Vue core releases](https://github.com/vuejs/core/releases)
- [Vite releases](https://github.com/vitejs/vite/releases)
