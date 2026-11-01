---
title: "نکته‌ی Next.js: برای read-your-own-writes از updateTag و برای بقیه‌ی موارد از revalidateTag(tag, 'max') استفاده کنید"
description: "Server Actionهایی که revalidateTag را با یک آرگومان صدا می‌زنند از فرم منسوخ‌شده استفاده می‌کنند. بدانید کِی updateTag، revalidateTag با profile یا refresh() درست است."
date: 2026-11-01
cover: /images/blog/2026-11-01-nextjs-update-tag-vs-revalidate-tag.svg
tags: [next.js, pro-tip, caching]
draft: false
---

در بسیاری از کدهای App Router هنوز Server Actionای هست که با `revalidateTag("posts")` تمام می‌شود و بعد `redirect()` می‌آید. امروز کار می‌کند، اما فرم تک‌آرگومانی منسوخ شده است و دلیل وجود این تغییر، تفاوتی است که مستندات فعلی صریح بیان می‌کنند: دو معنای مختلف برای باطل‌سازی کش وجود دارد و هرکدام API جدا دارد.

## اشتباه رایج

```ts
// app/actions.ts
"use server";

import { revalidateTag } from "next/cache";
import { redirect } from "next/navigation";

export async function createPost(formData: FormData) {
    const post = await db.post.create({ data: { title: formData.get("title") } });

    revalidateTag("posts"); // single-argument form
    redirect(`/posts/${post.id}`);
}
```

اینجا دو مشکل پنهان است.

اول اینکه [مرجع `revalidateTag`](https://nextjs.org/docs/app/api-reference/functions/revalidateTag) امضا را `revalidateTag(tag, profile)` مستند کرده و فرم تک‌آرگومانی را منسوخ می‌داند. این فرم فقط وقتی کار می‌کند که خطاهای TypeScript را سرکوب کنید و مستندات هشدار می‌دهند ممکن است در نسخه‌های بعدی حذف شود.

دوم اینکه رفتار بدون profile آن چیزی نیست که بیشتر افراد فرض می‌کنند. مستندات می‌گویند حذف آرگومان دوم مثل `{ expire: 0 }` رفتار می‌کند: هرگز محتوای قدیمی سرو نمی‌شود و درخواست بعدی روی revalidate مسدودکننده منتظر می‌ماند. این رفتار برای «کاربر همین الان چیزی ذخیره کرد» درست است، اما شما آن را تصادفی و از مسیری گرفته‌اید که در حال حذف است، آن هم با تابعی که حالت پیشنهادی‌اش دقیقاً برعکس عمل می‌کند.

## دو معنا، دو تابع

مستندات باطل‌سازی کش را به دو هدف تقسیم می‌کنند.

**Read-your-own-writes: تابع `updateTag`.** [مرجع `updateTag`](https://nextjs.org/docs/app/api-reference/functions/updateTag) آن را برای حالتی طراحی‌شده می‌داند که کاربر چیزی را تغییر می‌دهد و رابط باید همان لحظه تغییر را نشان دهد. داده‌ی دارای آن تگ فوراً منقضی می‌شود و درخواست بعدی به‌جای محتوای قدیمی منتظر داده‌ی تازه می‌ماند. این تابع فقط داخل Server Actions قابل صدا زدن است و در Route Handler خطا می‌دهد.

```ts
"use server";

import { updateTag } from "next/cache";
import { redirect } from "next/navigation";

export async function createPost(formData: FormData) {
    const post = await db.post.create({ data: { title: formData.get("title") } });

    updateTag("posts"); // list pages
    updateTag(`post-${post.id}`); // detail page
    redirect(`/posts/${post.id}`);
}
```

این همان الگوی مثال مستندات است: صفحه‌ی فهرست و صفحه‌ی جزئیات را با تگ‌های جدا برچسب بزنید، هر دو را منقضی کنید و بعد به صفحه‌ای که داده‌ی تازه رندر می‌کند redirect کنید.

**تازگی نهایی (eventual): `revalidateTag(tag, "max")`.** با profile پیشنهادی `max`، داده‌ی تگ‌دار «قدیمی» علامت می‌خورد. درخواست بعدی همان نسخه‌ی قدیمی را می‌گیرد و revalidate در پس‌زمینه اجرا می‌شود، یعنی stale-while-revalidate. مستندات `max` را پنجره‌ای یک‌ساله توصیف می‌کنند، به‌اندازه‌ای بلند که درخواست‌ها همیشه در زمان revalidate محتوای قدیمی بگیرند. برای محتوایی که کمی تأخیر در آن قابل‌قبول است مناسب است: پست‌های وبلاگ، کاتالوگ‌ها، مستندات. در Server Functions و Route Handlers کار می‌کند، اما در Client Components و Proxy نه.

```ts
// app/api/revalidate/route.ts
import type { NextRequest } from "next/server";
import { revalidateTag } from "next/cache";

export async function GET(request: NextRequest) {
    const tag = request.nextUrl.searchParams.get("tag");
    if (!tag) return Response.json({ revalidated: false });

    revalidateTag(tag, "max");
    return Response.json({ revalidated: true, now: Date.now() });
}
```

(این route از الگوی مستندات گرفته شده است. در پروژه‌ی واقعی جلوی هر endpointی که می‌تواند کش را باطل کند احراز هویت بگذارید؛ مثال مستندات آن را نشان نمی‌دهد.)

## کِی کدام

| وضعیت                                                              | فراخوانی                                          |
| ------------------------------------------------------------------ | ------------------------------------------------- |
| کاربر فرم را ارسال می‌کند و به صفحه‌ای می‌رسد که باید نوشته را ببیند | `updateTag(tag)` در Server Action                 |
| CMS یا webhook خبر می‌دهد محتوا عوض شده                            | `revalidateTag(tag, "max")` در Route Handler      |
| webhook که داده باید همان لحظه حذف شود                             | `revalidateTag(tag, { expire: 0 })`               |
| ویرایش ادمین که چند ثانیه کهنگی مهم نیست                           | `revalidateTag(tag, "max")` در Server Action      |

ردیف سوم همان است که مستندات صریح ذکر می‌کنند: وقتی باطل‌سازی از بیرون Server Action می‌آید، `updateTag` در دسترس نیست، پس `{ expire: 0 }` بدهید تا داده فوراً منقضی شود. آرگومان profile پروفایل‌های دیگر تعریف‌شده در `cacheLife` را هم می‌پذیرد که فقط `expire` آن خوانده می‌شود، یا شیئی با `expire` بر حسب ثانیه.

## جزئیات زمانی که اهمیت دارد

مستندات یادآوری می‌کنند که revalidate را درخواست راه می‌اندازد، نه خود فراخوانی `revalidateTag`. صفحاتی که از آن تگ استفاده می‌کنند هم‌زمان نیستند و هنگام بازدید revalidate می‌شوند. دو نتیجه برای محیط production:

- صدا زدن `revalidateTag(tag, "max")` بعد از یک import بزرگ باعث هجوم هم‌زمان نمی‌شود. هر صفحه وقتی کسی آن را بخواهد revalidate می‌شود.
- همچنین یعنی اولین بازدیدکننده‌ی بعد از فراخوانی هنوز محتوای قدیمی را می‌بیند. اگر او همان نویسنده‌ای باشد که همین الان ذخیره کرده، یک باگ read-your-own-writes دارید. دقیقاً همین حالت دلیل وجود `updateTag` است.

## تگ باید از قبل وجود داشته باشد

هیچ‌کدام از این دو تابع کاری نمی‌کنند مگر اینکه تگ به داده‌ی کش‌شده نسبت داده شده باشد. این کار با `fetch(url, { next: { tags: ["posts"] } })` یا با `cacheTag("posts")` داخل تابع یا کامپوننتی با `"use cache"` انجام می‌شود. تگ‌ها به بزرگی و کوچکی حروف حساس‌اند و حداکثر ۲۵۶ نویسه. مستندات `revalidateTag` نتیجه‌ی ناخوشایندی هم اضافه می‌کنند: تگی که از این حد بگذرد هرگز به داده‌ی کش‌شده نسبت داده نمی‌شود، پس revalidate کردنش بی‌صدا هیچ کاری نمی‌کند. تگ‌ها را با یک helper از روی IDها بسازید و پیشوند را کوتاه نگه دارید.

```ts
import { cacheTag } from "next/cache";

export async function getPost(id: string) {
    "use cache";
    cacheTag("posts", `post-${id}`);
    return db.post.findUnique({ where: { id } });
}
```

## جای `refresh()` کجاست

یک تابع سوم هم در همین ماژول هست. [مرجع `refresh`](https://nextjs.org/docs/app/api-reference/functions/refresh) آن را تازه‌سازی router سمت کلاینت از داخل Server Action توصیف می‌کند. مثل `updateTag` فقط در Server Actions کار می‌کند و مثال آن بعد از نوشتن در پایگاه داده بدون آرگومان صدایش می‌زند. تگ نمی‌گیرد، پس ابزار باطل‌سازی کش نیست؛ وقتی چیزی که عوض شده پشت هیچ تگی نیست سراغش بروید.

## بده‌بستان‌ها

- `updateTag` درخواست بعدی را روی داده‌ی تازه متوقف می‌کند. هدفش همین است، اما حالا منبع داده‌ی کند بعد از هر نوشتن روی مسیر بحرانی کاربر قرار می‌گیرد. فقط تگ‌هایی را منقضی کنید که صفحه‌ی مقصد واقعاً می‌خواند.
- `revalidateTag(tag, "max")` صفحات را سریع نگه می‌دارد، اما می‌پذیرید که کسی ممکن است بعد از تغییر محتوای قدیمی ببیند. برای محتوایی که افراد ویرایش می‌کنند و بلافاصله بررسی می‌کنند این یک باگ است، نه ویژگی.
- تقسیم منطق بر اساس context یعنی یک mutation ممکن است در Server Action به `updateTag` و در webhook به `revalidateTag` نیاز داشته باشد. نام تگ‌ها را در یک ماژول بگذارید تا هر دو مسیر رشته‌های یکسان داشته باشند.
- مستندات می‌گویند `updateTag` و `revalidatePath` هدف‌های متفاوتی دارند و ممکن است باید با هم به کار بروند. وقتی یک داده در چند route ظاهر می‌شود تگ را ترجیح دهید و وقتی یک صفحه یا layout مشخص را باطل می‌کنید path را.

## کِی الگوی قدیمی هنوز اشکال ندارد

اگر کدتان کامپایل می‌شود و آن‌طور که می‌خواهید رفتار می‌کند، فردا چیزی نمی‌شکند، چون مستندات می‌گویند فرم تک‌آرگومانی فعلاً کار می‌کند. اما صراحتاً برای مهاجرت علامت خورده است: مستندات در Server Actions به `updateTag` و در جاهای دیگر به `profile="max"` اشاره می‌کنند. آن را یک پاکسازی مکانیکی بدانید: فراخوانی‌های `revalidateTag(` با یک آرگومان را جست‌وجو کنید و برای هر مورد تعیین کنید آیا کاربر باید نوشته را همان لحظه ببیند.

## منابع

- [updateTag — Next.js docs](https://nextjs.org/docs/app/api-reference/functions/updateTag)
- [revalidateTag — Next.js docs](https://nextjs.org/docs/app/api-reference/functions/revalidateTag)
- [refresh — Next.js docs](https://nextjs.org/docs/app/api-reference/functions/refresh)
