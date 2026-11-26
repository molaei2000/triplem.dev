---
title: "نکتهٔ حرفه‌ای Next.js: ماژول‌های داده را server-only کنید و DTO برگردانید، چون propها به Client Component عمومی‌اند"
description: "پاس‌دادن کل ردیف دیتابیس به کامپوننت 'use client' همهٔ فیلدها را به مرورگر می‌فرستد. با server-only، لایهٔ دسترسی به داده و DTO داده‌های خصوصی را بیرون نگه دارید."
date: 2026-11-26
cover: /images/blog/2026-11-26-nextjs-server-only-dto.svg
tags: [next.js, pro-tip, security]
draft: false
---

در ۷۲ ساعت گذشته چیز پایدار و تازه‌ای منتشر نشد که قبلاً پوشش نداده باشیم. [صفحهٔ releaseهای vuejs/core](https://github.com/vuejs/core/releases) هنوز فقط release candidateهای 3.6 را نشان می‌دهد (rc.16 در ۲۰ نوامبر) و 3.5.46 خط پایدار است، [صفحهٔ releaseهای Vite](https://github.com/vitejs/vite/releases) یک بتای 8.4 دارد و [وبلاگ Node.js](https://nodejs.org/en/blog) بعد از releaseهای امنیتی ۱۱ نوامبر فقط یک نسخهٔ alpha از 27 را فهرست کرده است. نکتهٔ قبلی دربارهٔ Nuxt بود، پس امروز نوبت Next.js است. مطالب با [راهنمای امنیت داده](https://nextjs.org/docs/app/guides/data-security) و [صفحهٔ Server and Client Components](https://nextjs.org/docs/app/getting-started/server-and-client-components) تطبیق داده شده است.

نکته: **propهایی که از Server Component به Client Component می‌دهید در RSC payload سریال می‌شوند و به مرورگر می‌روند. هر prop از این نوع را عمومی فرض کنید و مرز را با ماژول‌های `server-only` که DTOهای کوچک و هدفمند برمی‌گردانند، صریح کنید.**

## اشتباه رایج

دسترسی به داده در سطح کامپوننت راحت است: در صفحه کوئری می‌زنید و نتیجه را به یک کامپوننت تعاملی می‌دهید.

```tsx
// app/[slug]/page.tsx
import Profile from "./ui/profile";

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params;
    const [rows] = await sql`SELECT * FROM user WHERE slug = ${slug}`;
    return <Profile user={rows[0]} />; // every column of the row
}
```

```tsx
// app/[slug]/ui/profile.tsx
"use client";

export default function Profile({ user }: { user: User }) {
    return <h1>{user.name}</h1>;
}
```

کامپوننت فقط `name` را رندر می‌کند، اما prop کل ردیف است. راهنمای امنیت داده تقریباً همین مثال را می‌آورد و آن را افشای همهٔ فیلدها به کلاینت می‌نامد. RSC payload شامل propهایی است که به Client Componentها داده می‌شود، پس ایمیل، شمارهٔ تلفن یا یک پرچم داخلی در آن ردیف در همان payload می‌ماند، چه JSX آن را بخواند چه نخواند.

تایپ گشادِ `user: User` اوضاع را بدتر می‌کند. به توسعه‌دهندهٔ بعدی می‌گوید پاس‌دادن همه‌چیز اشکالی ندارد و وقتی این کار را می‌کند هیچ چیز شکست نمی‌خورد.

## چرا متغیرهای محیطی اینجا نجاتتان نمی‌دهند

اسرار مسئلهٔ جدا و محدودتری هستند. طبق مستندات فقط متغیرهای با پیشوند `NEXT_PUBLIC_` به bundle کلاینت می‌رسند و بقیه با رشتهٔ خالی جایگزین می‌شوند. پس تابع داده‌ای که `process.env.API_KEY` را می‌خواند و در یک Client Component import می‌شود، در زمان اجرا خراب می‌شود و کلید را لو نمی‌دهد. این یک تور ایمنی است، نه طراحی: اشتباه را وقتی می‌فهمید که چیزی می‌شکند و از داده‌ای که تابع برمی‌گرداند هیچ محافظتی نمی‌شود.

ردیف‌هایی که روی سرور گرفته‌اید اصلاً مشمول این قاعده نیستند. وقتی آن‌ها را به‌صورت prop به یک Client Component می‌دهید، داده‌ای هستند که مرورگر دریافت می‌کند.

## راه‌حل ۱: `server-only` سورپرایز زمان اجرا را به خطای build تبدیل می‌کند

در بالای هر ماژولی که با دیتابیس کار می‌کند، اسرار را می‌خواند یا منطق کسب‌وکار داخلی دارد، `import "server-only"` بگذارید:

```ts
// data/posts.ts
import "server-only";

export async function getPostRow(id: string) {
    // ...
}
```

اگر یک Client Component آن ماژول را import کند، چه مستقیم چه از طریق import دیگر، build شکست می‌خورد. مستندات می‌گویند نصب پکیج‌های `server-only` و `client-only` اختیاری است، چون Next.js این importها را خودش مدیریت می‌کند و محتوای پکیج npm را استفاده نمی‌کند. اگر قوانین lint وابستگی اضافه را گزارش می‌کنند می‌توانید نصبشان کنید، و مستندات اشاره می‌کنند Next.js برای پیکربندی‌هایی با `noUncheckedSideEffectImports` تایپ‌های خودش را هم دارد.

`client-only` نقطهٔ مقابل است، برای ماژول‌هایی که به `window` دست می‌زنند.

## راه‌حل ۲: لایهٔ دسترسی به داده که DTO برمی‌گرداند

راهنما برای پروژه‌های جدید یک Data Access Layer (DAL) اختصاصی پیشنهاد می‌کند: کدی که فقط روی سرور اجرا می‌شود، بررسی مجوز انجام می‌دهد و Data Transfer Objectهای حداقلی برمی‌گرداند. با اقتباس از مثال خود راهنما:

```ts
// data/user-dto.ts
import "server-only";
import { getCurrentUser } from "./auth";

export async function getProfileDTO(slug: string) {
    const [rows] = await sql`SELECT * FROM user WHERE slug = ${slug}`;
    const userData = rows[0];
    const viewer = await getCurrentUser();

    return {
        username: userData.username,
        phonenumber:
            viewer.isAdmin || userData.team === viewer.team ? userData.phonenumber : null,
    };
}
```

```tsx
// app/[slug]/page.tsx
import { getProfileDTO } from "@/data/user-dto";
import Profile from "./ui/profile";

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params;
    const profile = await getProfileDTO(slug);
    return <Profile user={profile} />;
}
```

حالا تایپ `user` در `Profile` می‌تواند همان شکل DTO باشد و ستون تازه‌ای که به جدول اضافه می‌شود به مرورگر نمی‌رسد، مگر اینکه کسی عمداً آن را به DTO اضافه کند. قاعدهٔ مجوز (چه کسی شمارهٔ تلفن را ببیند) کنار کوئری است، نه پخش‌شده در صفحه‌ها.

دو نکته از راهنما که ارزش برداشتن دارد. اول، تابع «فراخواننده کیست» را با `cache` ریاکت بپوشانید تا هر تابعی بدون عبور از طریق propها آن را بخواند؛ مستندات می‌گویند این کار از پاس‌دادن آبجکت کاربر از Server Component به Server Component دیگر و خطر رسیدنش به یک Client Component جلوگیری می‌کند. دوم، فقط DAL باید به `process.env` دست بزند.

## mutationها هم همین قاعده را دارند

راهنما این الگو را برای نوشتن هم به کار می‌برد: احراز هویت، مجوز و منطق دیتابیس را در یک ماژول `server-only` نگه دارید و اکشن `"use server"` را نازک بگذارید:

```ts
// app/actions.ts
"use server";

import { deletePost } from "@/data/posts";
import { revalidatePath } from "next/cache";

export async function deletePostAction(postId: string) {
    await deletePost(postId); // auth and ownership checks happen inside the DAL
    revalidatePath("/posts");
}
```

از یک اکشن هم فقط چیزی را برگردانید که UI لازم دارد. مستندات برگرداندن کل رکورد به‌روزشده را نمونهٔ بد و `{ success: true }` را نمونهٔ خوب نشان می‌دهند، چون مقدار بازگشتی هم به کلاینت سریال می‌شود.

## یک لایهٔ اضافه: tainting

راهنما APIهای taint ریاکت را هم توضیح می‌دهد: `experimental_taintObjectReference` برای آبجکت‌ها و `experimental_taintUniqueValue` برای مقادیر خاص، که با `experimental: { taint: true }` در `next.config.js` فعال می‌شوند. این‌ها از پاس‌داده‌شدن مقادیر taint‌شده به کلاینت جلوگیری می‌کنند. مستندات صریح می‌گویند این فقط لایهٔ اضافه است و باید باز هم داده را در DAL فیلتر کنید. به پیشوند `experimental_` توجه کنید: API پایدار نیست، پس تنها کنترل شما نباشد.

## trade-offها

- **فایل و indirection بیشتر.** برای یک نمونهٔ اولیه DAL سربار است. خود مستندات دسترسی در سطح کامپوننت را برای نمونه‌سازی و یادگیری می‌دانند و توصیه می‌کنند در هر codebase یک رویکرد را انتخاب کنید و ترکیبشان نکنید.
- **drift در DTO.** DTOای که فراموش کرده‌اید به‌روز کنید بی‌صدا فیلدی را که UI لازم دارد حذف می‌کند. این شکست ارزان‌تر است: فیلد گمشده در review دیده می‌شود، فیلد لورفته نه.
- **`server-only` مرز زمان build است، نه مجوزدهی.** از import جلوگیری می‌کند، نه از فراخوانی. Server Actionها هنوز با POST مستقیم در دسترس‌اند، پس هر اکشن باید فراخواننده و مالکیت منبع را بررسی کند، همان‌طور که راهنما تأکید می‌کند.

## کجا الگوی ساده کافی است

اگر کامپوننتی یک مقدار ساده مثل `likes: number` بگیرد، مانند مثال `LikeButton` در مستندات، چیزی برای لو رفتن نیست و DTO لازم نیست. قاعدهٔ سرانگشتی: propهای هر فایل `"use client"` را ببینید. اگر تایپ یک entity کامل را می‌پذیرد، آن را به فیلدهایی که رندر می‌شوند محدود کنید و بگذارید سرور دقیقاً همان شکل را تولید کند.

## منابع

- [Next.js: How to think about data security](https://nextjs.org/docs/app/guides/data-security)
- [Next.js: Server and Client Components](https://nextjs.org/docs/app/getting-started/server-and-client-components)
- [vuejs/core releases](https://github.com/vuejs/core/releases)
- [vitejs/vite releases](https://github.com/vitejs/vite/releases)
- [Node.js blog](https://nodejs.org/en/blog)
- [Next.js blog](https://nextjs.org/blog)
- [TypeScript DevBlog](https://devblogs.microsoft.com/typescript/)
