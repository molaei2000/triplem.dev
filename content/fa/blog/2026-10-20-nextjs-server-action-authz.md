---
title: "نکتهٔ حرفه‌ای Next.js: بررسی احراز هویت در سطح صفحه از Server Action داخل آن محافظت نمی‌کند"
description: "Server Actionها با POST مستقیم قابل فراخوانی‌اند. احراز هویت و مالکیت را داخل هر action دوباره بررسی کنید و منطق را در یک لایهٔ دسترسی به داده با server-only نگه دارید."
date: 2026-10-20
cover: /images/blog/2026-10-20-nextjs-server-action-authz.svg
tags: [next.js, pro-tip, security]
draft: false
---

در ۷۲ ساعت گذشته چیز مهم و تازه‌ای منتشر نشد که قبلاً پوشش نداده باشیم. Next.js 16.4.2 مربوط به ۱۵ اکتبر است و خط 16.5 هنوز canary است. Vite فقط به‌روزرسانی‌های scaffold در `create-vite` داشت و Vue روی یک release candidate از 3.6 است. پس امروز یک نکتهٔ حرفه‌ای داریم و بعد از آخرین نکتهٔ Nuxt، نوبت Next.js است. همهٔ مطالب زیر با [راهنمای Data Security](https://nextjs.org/docs/app/guides/data-security) و صفحهٔ [Mutating Data](https://nextjs.org/docs/app/getting-started/mutating-data) تطبیق داده شده است.

نکته: **بررسی احراز هویت در `page.tsx` از رابط کاربری‌ای که رندر می‌شود محافظت می‌کند، نه از Server Actionای که در آن صفحه تعریف یا import شده.** action نقطهٔ ورود جداگانه‌ای است و باید خودش فراخوانی‌کننده را راستی‌آزمایی کند.

## اشتباه رایج

```tsx
// app/admin/page.tsx
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";

export default async function AdminPage() {
    const session = await auth();
    if (!session?.user?.isAdmin) redirect("/login");

    return (
        <form
            action={async () => {
                "use server";
                await db.record.deleteMany(); // no check here
            }}
        >
            <button>Delete records</button>
        </form>
    );
}
```

امن به نظر می‌رسد: کاربر غیرادمین redirect می‌شود و دکمه را نمی‌بیند. اما مستندات صریحاً می‌گوید Server Actionِ export‌شده از طریق درخواست POST مستقیم هم قابل فراخوانی است، نه فقط از راه رابط کاربری. redirect فقط تعیین می‌کند چه HTML‌ای رندر شود؛ دربارهٔ اینکه چه کسی مجاز به اجرای تابع است چیزی نمی‌گوید.

Next.js تا حدی این را سخت‌تر کرده است: شناسه‌های action رمزنگاری‌شده و غیرقطعی‌اند، حداکثر ۱۴ روز کش می‌شوند و با build جدید دوباره ساخته می‌شوند، و actionهای استفاده‌نشده از bundle کلاینت حذف می‌شوند. راهنما صریح می‌گوید این‌ها فقط وقتی لایهٔ احراز هویت غایب باشد ریسک را کم می‌کنند، و باید همچنان actionها را قابل POST عمومی فرض کنید و داخل هرکدام auth را بررسی کنید.

## راه‌حل ۱: داخل خود action دوباره بررسی کنید

```tsx
action={async () => {
    "use server";
    const session = await auth();
    if (!session?.user?.isAdmin) throw new Error("Unauthorized");
    await db.record.deleteMany();
}}
```

صدا زدن دوبارهٔ `auth()` عمدی است. اگر `auth()` شما از `cookies()` می‌خواند، در هر دو جا یکسان کار می‌کند و پیچیدنش در `cache` ری‌اکت فراخوانی‌های تکراری در یک درخواست را ارزان نگه می‌دارد.

## راه‌حل ۲: احراز هویت همان مجوزدهی نیست

وقتی action شناسه می‌گیرد، «آیا کسی وارد شده؟» کافی نیست. مثال مستندات برای حذف امن در برابر IDOR، منبع را بارگذاری می‌کند و مالک آن را مقایسه می‌کند:

```ts
"use server";

export async function deletePost(postId: string) {
    const session = await auth();
    if (!session?.user) throw new Error("Unauthorized");

    const post = await db.post.findUnique({ where: { id: postId } });
    if (post.authorId !== session.user.id) throw new Error("Forbidden");

    await db.post.delete({ where: { id: postId } });
}
```

هر چیزی که به‌صورت آرگومان، فیلد `FormData`، هدر یا مقدار `searchParams` می‌رسد زیر کنترل کلاینت است. قاعدهٔ راهنما این است که در هر فراخوانی اعتبارسنجی شود. یک `<input name="id">` مخفی مجوز نیست.

## راه‌حل ۳: فایل‌های `"use server"` را نازک نگه دارید

تکرار این بررسی‌ها در ده‌ها action راهی است که یکی‌شان فراموش شود. راهنما پیشنهاد می‌کند همان Data Access Layer را که برای خواندن استفاده می‌کنید برای mutationها هم به کار ببرید: auth، مجوزدهی و دسترسی به پایگاه داده در ماژولی با `import "server-only"` می‌ماند و action فقط واگذار می‌کند و بعد revalidate می‌کند.

```ts
// data/posts.ts
import "server-only";

export async function deletePost(postId: string) {
    const session = await auth();
    if (!session?.user) throw new Error("Unauthorized");
    const post = await db.post.findUnique({ where: { id: postId } });
    if (post.authorId !== session.user.id) throw new Error("Forbidden");
    await db.post.delete({ where: { id: postId } });
}
```

```ts
// app/actions.ts
"use server";

import { deletePost } from "@/data/posts";
import { revalidatePath } from "next/cache";

export async function deletePostAction(postId: string) {
    await deletePost(postId); // auth + authz happen inside the DAL
    revalidatePath("/posts");
}
```

دو مزیت دارد. سطح ممیزی به یک پوشه کم می‌شود: چک‌لیست ممیزی راهنما می‌پرسد آیا دسترسی به پایگاه داده به یک DAL با `server-only` واگذار شده و آیا متغیرهای محیطی بیرون از آن لمس می‌شوند. و actionای که بررسی‌های خودش را فراموش کند باز هم نمی‌تواند بررسی‌های DAL را دور بزند، چون DAL تنها کدی است که به پایگاه داده می‌رسد. مستندات اضافه می‌کند که `import "server-only"` در خود فایل `"use server"` هم کار می‌کند، حتی اگر یک Client Component برای `useActionState` آن را import کند.

## دو نکتهٔ مرتبط

**مقدار بازگشتی به کلاینت سریالایز می‌شود.** برگرداندن `db.user.update(...)` کل رکورد را به مرورگر می‌دهد. به‌جای آن `{ success: true }` یا یک DTO حداقلی برگردانید.

**closureها رمزنگاری می‌شوند، اما محرمانه نیستند.** action درون‌خطی متغیرهای رندر اطراف را می‌گیرد. این مقادیر به کلاینت می‌روند و برمی‌گردند و Next.js با کلید مخصوص هر action که در زمان build ساخته می‌شود رمزنگاری‌شان می‌کند. راهنما می‌گوید برای مقادیر حساس فقط به این رمزنگاری تکیه نکنید. اگر روی چند instance خودمیزبان هستید، کلیدها در هر build و هر سرور فرق می‌کنند، مگر `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY` را روی یک کلید AES با کدگذاری base64 (۱۶، ۲۴ یا ۳۲ بایت؛ `openssl rand -base64 32` کار می‌کند) تنظیم کنید.

## مصالحه‌ها و ملاحظات

- **کار اضافه در هر action.** یک `auth()` اضافه و گاهی یک کوئری پایگاه داده در هر mutation اجرا می‌شود. این هزینهٔ درستی است. `cache()` خواندن session را dedupe می‌کند و کوئری مالکیت معمولاً چیزی است که خود mutation هم لازم دارد.
- **CSRF بیشتر خودکار مدیریت می‌شود.** actionها فقط POST هستند و Next.js هدر `Origin` را با `Host` (یا `X-Forwarded-Host`) مقایسه می‌کند و در صورت ناهماهنگی درخواست را قطع می‌کند. پشت reverse proxy که این دو فرق دارند، `experimental.serverActions.allowedOrigins` را تنظیم می‌کنید. این جایگزین مجوزدهی نیست.
- **actionهای پرهزینه را rate limit کنید.** راهنما برای کارهایی مثل ارسال ایمیل یا نوشتن در پایگاه داده توصیه‌اش می‌کند و برای مثال به راهنمای Backend for Frontend ارجاع می‌دهد.
- **DAL اجباری نیست.** راهنما رویکرد صدا زدن APIهای HTTP موجود با نگاه zero-trust را هم توضیح می‌دهد، که وقتی تیم بک‌اند جداگانه مجوزدهی را اعمال می‌کند مناسب است. توصیه این است که برای هر پروژه یک رویکرد انتخاب کنید و مخلوط نکنید.
- **در اپ‌های کوچک بررسی درون‌خطی کافی است.** با سه action، یک `auth()` در ابتدای هرکدام کاملاً معقول است. وقتی تعداد زیاد شود و یکدست‌بودن مسئله شود، DAL ارزشش را نشان می‌دهد.

## چک‌لیست سریع بازبینی

1. آیا هر تابع `"use server"` خودش `auth()` را صدا می‌زند و به صفحه تکیه نمی‌کند؟
2. آیا مالکیت همان منبع مشخص را بررسی می‌کند، نه فقط وضعیت ورود را؟
3. آیا آرگومان‌هایش اعتبارسنجی می‌شوند و مقدار بازگشتی حداقلی است؟
4. آیا دسترسی به پایگاه داده فقط از طریق ماژول `server-only` ممکن است؟
5. آیا بعد از mutation، `redirect()` یا `revalidatePath()` صدا زده می‌شود، با `revalidatePath` اول، چون `redirect` استثنا پرتاب می‌کند و کد بعدی اجرا نمی‌شود؟

## منابع

- https://nextjs.org/docs/app/guides/data-security
- https://nextjs.org/docs/app/getting-started/mutating-data
- https://github.com/vercel/next.js/releases
- https://github.com/vitejs/vite/releases
- https://github.com/vuejs/core/releases
