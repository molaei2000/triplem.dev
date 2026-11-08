---
title: "نکته‌ی حرفه‌ای Next.js: لاگ و آنالیتیکس را به after() ببرید تا از مسیر پاسخ بیرون بمانند"
description: "await کردن آنالیتیکس یا لاگ پیش از بازگرداندن پاسخ، هر درخواست را کند می‌کند. ببینید after() در Next.js چطور کار می‌کند، API‌های درخواست کجا مجازند و self-hosting چه می‌خواهد."
date: 2026-11-08
cover: /images/blog/2026-11-08-nextjs-after-post-response-work.svg
tags: [next.js, pro-tip, performance]
draft: false
---

یک handler برای mutation با `await logUserAction(...)` تمام می‌شود، یا یک layout پیش از برگرداندن JSX منتظر یک فراخوانی آنالیتیکس می‌ماند. هیچ چیز در پاسخ به این کار وابسته نیست، اما کاربر باز هم منتظر می‌ماند. Next.js برای این وضعیت یک ابزار پایدار دارد: `after`. [مرجع رسمی](https://nextjs.org/docs/app/api-reference/functions/after) آن را راهی برای زمان‌بندی کاری توصیف می‌کند که پس از پایان پاسخ (یا prerender) اجرا می‌شود و هدفش اثرهای جانبی مثل لاگ و آنالیتیکس است. طبق جدول تاریخچه‌ی نسخه در همان صفحه، این API از `v15.1.0` پایدار شد.

## الگویی که باید جایگزین شود

```ts
// app/api/orders/route.ts
import { cookies, headers } from "next/headers";
import { saveOrder, logUserAction } from "@/app/utils";

export async function POST(request: Request) {
    const order = await saveOrder(await request.json());

    // The client waits for this, although the response doesn't need its result.
    const userAgent = (await headers()).get("user-agent") ?? "unknown";
    const session = (await cookies()).get("session-id")?.value ?? "anonymous";
    await logUserAction({ session, userAgent, orderId: order.id });

    return Response.json({ status: "success", id: order.id });
}
```

هر میلی‌ثانیه‌ای که `logUserAction` صرف می‌کند به زمان پاسخ اضافه می‌شود. اگر بک‌اند آنالیتیکس دم کند داشته باشد، mutation شما هم آن را به ارث می‌برد. رها کردن یک promise (fire-and-forget) هم راه‌حل درستی نیست: روی پلتفرم serverless ممکن است invocation پیش از settle شدن promise تمام شود و چیزی به runtime نمی‌گوید که صبر کند.

## نسخه‌ی بهتر

```ts
import { after } from "next/server";
import { cookies, headers } from "next/headers";
import { saveOrder, logUserAction } from "@/app/utils";

export async function POST(request: Request) {
    const order = await saveOrder(await request.json());

    after(async () => {
        const userAgent = (await headers()).get("user-agent") ?? "unknown";
        const session = (await cookies()).get("session-id")?.value ?? "anonymous";
        await logUserAction({ session, userAgent, orderId: order.id });
    });

    return Response.json({ status: "success", id: order.id });
}
```

callback بعد از پایان پاسخ اجرا می‌شود. طبق مستندات، `after` در Server Components (از جمله `generateMetadata`)، Server Functions، Route Handlers و Proxy کار می‌کند. حتی وقتی پاسخ با موفقیت کامل نشده هم اجرا می‌شود؛ یعنی هنگام پرتاب خطا یا فراخوانی `notFound` و `redirect`. برای audit trail و لاگ‌های مرتبط با خطا مناسب است و برای کارهایی که فقط در حالت موفقیت می‌خواهید، مناسب نیست. اگر این برایتان مهم است، پیش از زمان‌بندی کار، نتیجه را خودتان بررسی کنید.

## API‌های درخواست کجا مجازند

این بخش همان جایی است که بیشتر مردم گیر می‌کنند و به محل فراخوانی بستگی دارد:

- **Route Handlers و Server Functions:** `cookies()` و `headers()` را می‌توان مستقیم داخل callback صدا زد، مثل مثال بالا.
- **Server Components (صفحه‌ها، layoutها، `generateMetadata`):** نمی‌توان. مستندات توضیح می‌دهد Next.js باید بداند کدام بخش درخت داده‌ی درخواست را می‌خواند تا Partial Prerendering و Cache Components را پشتیبانی کند، و `after` خارج از چرخه‌ی رندر React اجرا می‌شود. صدا زدن `cookies()` یا `headers()` داخل callback در زمان اجرا خطا می‌دهد.

در Server Component مقادیر را از قبل بخوانید و با closure به callback بدهید:

```tsx
import { after } from "next/server";
import { cookies, headers } from "next/headers";
import { logUserAction } from "@/app/utils";

export default async function Page() {
    const userAgent = (await headers()).get("user-agent") ?? "unknown";
    const session = (await cookies()).get("session-id")?.value ?? "anonymous";

    after(() => {
        logUserAction({ session, userAgent });
    });

    return <h1>My Page</h1>;
}
```

با Cache Components همین قاعده با `<Suspense>` ترکیب می‌شود. مستندات نشان می‌دهد کوکی را در یک کامپوننت فرزند dynamic می‌خوانید، همان‌جا با مقدار گرفته‌شده `after` را صدا می‌زنید و بقیه‌ی صفحه در static shell می‌ماند. چیزی که آن فرزند را dynamic می‌کند خواندن کوکی است، نه خود `after`.

## after مسیر را dynamic نمی‌کند

مستندات می‌گوید `after` یک Request-time API نیست و صدا زدنش مسیر را dynamic نمی‌کند. نتیجه‌اش را دو بار بخوانید: داخل یک صفحه‌ی static، callback در زمان build یا هر بار که صفحه revalidate شود اجرا می‌شود. پس `after` در صفحه‌ی استاتیک یعنی «هر بازدید را لاگ کن» نیست. برای آنالیتیکس به‌ازای هر درخواست، آن را در Route Handler، Server Function، Proxy یا کامپوننتی بگذارید که واقعاً برای هر درخواست رندر می‌شود.

## حذف تکرار با React.cache

مستندات می‌گوید در Server Components می‌توان از `cache` در React برای حذف تکرار فراخوانی‌های داخل `after` استفاده کرد و callback از مقادیری که در رندر محاسبه شده‌اند دوباره استفاده می‌کند. اگر لاگ شما داده‌ای می‌خواهد که صفحه از قبل لود کرده، loader را در `cache` بپیچید و دوباره fetch نکنید. فراخوانی‌های `after` را می‌توان تو در تو هم نوشت، پس می‌توانید توابع کمکی کوچکی بسازید که کار را با رفتار یکسان زمان‌بندی می‌کنند.

## Self-hosting و serverless

محل اجرا مهم است، چون کار پس از پاسخ به runtime‌ای نیاز دارد که زنده بماند.

| روش استقرار | پشتیبانی |
| --- | --- |
| Node.js server | بله |
| Docker container | بله |
| Static export | خیر |
| Adapters | بسته به پلتفرم |

برای serverless، مستندات توضیح می‌دهد Next.js به ابزاری به نام `waitUntil(promise)` تکیه دارد که عمر invocation را تا settle شدن promiseها تمدید می‌کند. اگر پلتفرم خودتان را می‌سازید، باید معادلی فراهم کنید که Next.js از طریق یک accessor روی `globalThis` به آن برسد.

وقتی خودتان `next start` را اجرا می‌کنید، [راهنمای self-hosting](https://nextjs.org/docs/app/guides/self-hosting) می‌گوید `after` کاملاً پشتیبانی می‌شود. مشکل معمولاً هنگام خاموش شدن پیش می‌آید: سیگنال `SIGINT` یا `SIGTERM` بفرستید و صبر کنید، آنگاه سرور درخواست‌های در حال انجام را تمام می‌کند و callbackهای `after()` منتظر را پیش از خروج اجرا می‌کند. راهنما یک بازه‌ی drain بین ۱۰ تا ۳۰ ثانیه توصیه می‌کند. در یک orchestrator کانتینری یعنی اگر grace period خاتمه از کندترین callback شما کوتاه‌تر باشد، کار نیمه‌کاره قطع می‌شود. بررسی کنید `terminationGracePeriodSeconds` (یا timeout توقف Docker) جا داشته باشد.

مدت اجرا هم محدود است. `after` تا سقف مدت پیش‌فرض یا تنظیم‌شده‌ی پلتفرم برای آن مسیر اجرا می‌شود و اگر پلتفرم پشتیبانی کند، می‌توانید با تنظیم `maxDuration` در route segment config این سقف را بالا ببرید.

## Trade-offها

- **تضمین تحویل وجود ندارد.** این کار درون همان process انجام می‌شود. اگر process به‌اجبار kill شود یا به سقف پلتفرم برسید، callback از دست می‌رود. برای چیزهایی که نباید گم شوند، مثل رویدادهای صورت‌حساب، داخل خود درخواست در یک صف یا ردیف دیتابیس پایدار بنویسید و `after` را فقط برای شروع پردازش کندتر به کار ببرید.
- **راهی برای گزارش به کاربر نیست.** پاسخ رفته است. خطاهای داخل callback باید مدیریت و گزارش جدا داشته باشند؛ آن‌ها را بپیچید و به ابزار ردیابی خطا بفرستید.
- **کار ضروری را جابه‌جا نکنید.** اگر صفحه‌ی بعدی به داده‌ی نوشته‌شده نیاز دارد (مثلاً الگوی read-your-own-writes)، نوشتن را در مسیر درخواست نگه دارید. `after` برای کاری است که پاسخ به آن وابسته نیست.
- **ترتیب و تست.** چون callback بعداً اجرا می‌شود، تست‌هایی که اثر جانبی را assert می‌کنند باید منتظر آن بمانند.

## کی الگوی قبلی هنوز درست است

وقتی نتیجه وارد پاسخ می‌شود، وقتی باید شکست به فراخواننده برسد، یا وقتی نوشتن خودِ حاصل درخواست است، await مستقیم درست است. یک شمارنده‌ی همزمان و ارزان هم ارزش بازآرایی ندارد. وقتی کار کند یا نوسانی است، پاسخ به نتیجه‌اش نیاز ندارد و از دست رفتن گاه‌به‌گاهش پذیرفتنی است یا جای دیگری پوشش داده شده، سراغ `after` بروید.

## منابع

- [after – Next.js API reference](https://nextjs.org/docs/app/api-reference/functions/after)
- [How to self-host your Next.js application](https://nextjs.org/docs/app/guides/self-hosting)
