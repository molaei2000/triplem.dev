---
title: "نکتهٔ حرفه‌ای Next.js: در هر scope از 'use cache' تابع cacheLife را صریح بنویسید، چون cacheهای تو در تو بی‌صدا عمر cache بیرونی را عوض می‌کنند"
description: "scope‌ای از 'use cache' بدون cacheLife پروفایل default را می‌گیرد و یک cache درونیِ کوتاه‌عمر می‌تواند آن را کوتاه کند یا build را بشکند. عمر را صریح بنویسید."
date: 2026-11-25
cover: /images/blog/2026-11-25-nextjs-cache-life-explicit.svg
tags: [next.js, pro-tip, caching]
draft: false
---

در ۷۲ ساعت گذشته چیز پایدار و مهمی منتشر نشد که قبلاً پوشش نداده باشیم. [تازه‌ترین انتشار Vue هنوز یک release candidate از نسخهٔ 3.6 است (rc.16)](https://github.com/vuejs/core/releases)، جدیدترین خط Vite یک [بتای 8.4](https://github.com/vitejs/vite/releases) است و بقیه patch هستند. پس امروز یک نکتهٔ حرفه‌ای داریم و چون نکتهٔ قبلی دربارهٔ Nuxt بود، نوبت Next.js است. همهٔ مطالب زیر با [مرجع `cacheLife`](https://nextjs.org/docs/app/api-reference/functions/cacheLife) تطبیق داده شده است که آخرین به‌روزرسانی‌اش ۲۰۲۶-۱۱-۱۸ است.

نکته: **`cacheLife` را در هر scope از `use cache` صدا بزنید، از جمله scopeهای بیرونی. scope‌ای که آن را حذف کند عمرش را از پروفایل `default` می‌گیرد و cacheهای تو در تو می‌توانند این نتیجه را بدون دست‌زدن به فایل بیرونی تغییر دهند.**

## اشتباه رایج

بیشتر کدهای `use cache` به‌عنوان راهی سریع برای ایستا کردن یک کامپوننت شروع می‌شوند:

```tsx
// app/dashboard/page.tsx
import { Widget } from "./widget";

export default async function Dashboard() {
    "use cache";
    // no cacheLife: "whatever the default is"

    return (
        <div>
            <h1>Dashboard</h1>
            <Widget />
        </div>
    );
}
```

کار می‌کند و کسی دوباره نگاهش نمی‌کند. عمر cache ضمنی است و مستندات صریحاً توصیه می‌کنند چنین نکنید: می‌گویند در هر scope از `use cache` یک `cacheLife` بگذارید تا رفتار در محل فراخوانی روشن باشد، چون حذفش پروفایل `default` را حاکم می‌کند و استدلال دربارهٔ scopeهای تو در تو را سخت‌تر می‌کند.

## «پیش‌فرض» دقیقاً چیست

پروفایل `default` سه عدد دارد که معنای متفاوتی دارند:

| ویژگی        | مقدار در `default` | چه چیزی را کنترل می‌کند                                                                |
| ------------ | ------------------ | -------------------------------------------------------------------------------------- |
| `stale`      | ۵ دقیقه            | router سمت کلاینت چقدر محتوا را بدون پرسیدن از سرور دوباره استفاده می‌کند             |
| `revalidate` | ۱۵ دقیقه           | بعد از آن، درخواست بعدی نسخهٔ cache‌شده را می‌گیرد و یک بازسازی پس‌زمینه شروع می‌شود |
| `expire`     | هرگز               | بعد از این مدت بدون ترافیک، درخواست بعدی منتظر محتوای تازه می‌ماند                   |

`stale` فقط سمت کلاینت است. سرور آن را در هدر پاسخ `x-nextjs-stale-time` می‌فرستد، هدر `Cache-Control` نیست و حداقل ۳۰ ثانیه اعمال می‌شود تا لینک‌های prefetch‌شده قابل استفاده بمانند. آن را TTL سرور نخوانید.

پروفایل‌های آماده، از همان صفحه:

| پروفایل   | `stale`  | `revalidate` | `expire` |
| --------- | -------- | ------------ | -------- |
| `seconds` | ۳۰ ثانیه | ۱ ثانیه      | ۱ دقیقه  |
| `minutes` | ۵ دقیقه  | ۱ دقیقه      | ۱ ساعت   |
| `hours`   | ۵ دقیقه  | ۱ ساعت       | ۱ روز    |
| `days`    | ۵ دقیقه  | ۱ روز        | ۱ هفته   |
| `weeks`   | ۵ دقیقه  | ۱ هفته       | ۳۰ روز   |
| `max`     | ۵ دقیقه  | ۳۰ روز       | ۱ سال    |

## چرا ضمنی بودن تله است: تو در تویی

وقتی scope بیرونی `cacheLife` ندارد، یک cache درونی با عمر کوتاه‌تر می‌تواند عمر بیرونی را کم کند. مستندات حسابش را می‌دهند: اگر `Widget` روی ۵ دقیقه باشد، `Dashboard` هم ۵ دقیقه می‌شود؛ اگر `Widget` روی ۱ ساعت باشد، `Dashboard` روی پیش‌فرض ۱۵ دقیقه می‌ماند، چون cacheهای درونی نمی‌توانند آن را بلندتر کنند.

پس عمر بیرونی تابعی از هر کامپوننت cache‌شدهٔ زیر آن است، از جمله آن‌هایی که در ماژول‌های import‌شده یا بسته‌های ثالث‌اند. اگر کسی `Widget` را به پروفایل کوتاه‌تری ببرد، آنچه `Dashboard` سرو می‌کند عوض می‌شود، در فایلی که diff اصلاً نشانش نمی‌دهد.

`cacheLife` صریح در scope بیرونی این را تمام می‌کند. مستندات می‌گویند cache بیرونی آن‌وقت عمر خودش را به کار می‌برد، بدون توجه به آنچه درونش تو در تو است، چه بلندتر چه کوتاه‌تر، و یک hit کل خروجی از جمله داده‌های تو در تو را برمی‌گرداند:

```tsx
import { cacheLife } from "next/cache";
import { Widget } from "./widget";

export default async function Dashboard() {
    "use cache";
    cacheLife("hours"); // decided here, not inherited

    return (
        <div>
            <h1>Dashboard</h1>
            <Widget />
        </div>
    );
}
```

## خطایی که در زمان build پیدا می‌شود

نسخهٔ بلندصداتری از همین مشکل هم هست. قواعد prerender در مرجع می‌گویند یک cache از prerender حذف می‌شود و به «حفرهٔ dynamic» تبدیل می‌شود که در زمان درخواست حل می‌شود، وقتی:

- `revalidate` برابر `0` باشد یا `expire` کمتر از ۵ دقیقه؛
- `stale` کمتر از ۳۰ ثانیه باشد (prefetch پیش از کلیک منقضی می‌شود)؛
- اگر `stale` بین ۳۰ ثانیه و ۵ دقیقه باشد، محتوا prerender می‌شود ولی از App Shell مسیر بیرون می‌ماند.

از میان پروفایل‌های آماده فقط `seconds` از یکی از این خط‌ها می‌گذرد (`expire` برابر ۱ دقیقه). اگر یک cache از نوع `seconds` داخل `use cache`ِ بیرونیِ بدون `cacheLife` صریح باشد، عمر بیرونی هم بی‌صدا کوتاه می‌شد. Next.js اجازه نمی‌دهد این بی‌صدا رخ دهد و در زمان prerender خطا می‌دهد. مستندات اضافه می‌کنند که cache تو در تو ممکن است در ماژول import‌شده یا یک dependency باشد؛ دقیقاً به همین دلیل نمی‌شود به خواندن فایل بیرونی بسنده کرد.

دو راه‌حل معتبر دارید و انتخاب میان آن‌ها اصل این نکته است.

**scope بیرونی را ایستا نگه دارید** و عمر واقعی به آن بدهید. آن‌وقت cache درونیِ کوتاه‌عمر دیگر آن را پایین نمی‌کشد:

```tsx
export default async function Page() {
    "use cache";
    cacheLife("default"); // explicit, so the nested 'seconds' cache no longer errors

    return (
        <div>
            <h1>Dashboard</h1>
            <p>Last updated: {new Date().toISOString()}</p>
            <ShortLivedWidget />
        </div>
    );
}
```

**عمر کوتاه را عمدی کنید** و آن را درون یک مرز `Suspense` ببرید تا بقیهٔ صفحه در prerender بماند. نمونهٔ مستندات برای این کار از `"use cache: remote"` استفاده می‌کند و یادآوری می‌کند که cache درون‌حافظهٔ پیش‌فرض در استقرارهای serverless میان درخواست‌ها باقی نمی‌ماند و در self-hosting ممکن است کافی باشد:

```tsx
async function Content() {
    "use cache: remote";
    cacheLife("seconds"); // intentionally short-lived
    return (
        <>
            <p>Last updated: {new Date().toISOString()}</p>
            <ShortLivedWidget />
        </>
    );
}

export default function Page() {
    return (
        <div>
            <h1>Dashboard</h1>
            <Suspense fallback={<p>Loading...</p>}>
                <Content />
            </Suspense>
        </div>
    );
}
```

## واژگان را صریح کنید، نه عددها را

اگر پروژه مدام همان سه عدد را می‌نویسد، به‌جای object inline یک پروفایل نام‌دار در `next.config.ts` تعریف کنید. ویژگی‌های حذف‌شده از `default` ارث می‌برند، پس هر سه را بنویسید:

```ts
// next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    cacheComponents: true,
    cacheLife: {
        editorial: {
            stale: 600, // 10 minutes
            revalidate: 3600, // 1 hour
            expire: 86400, // 1 day
        },
    },
};

export default nextConfig;
```

بعد `cacheLife("editorial")` همه‌جا یک معنا دارد. دو هشدار از مستندات: اول، می‌توانید نام‌های آماده‌ای مثل `hours` را دوباره تعریف کنید، اما خواننده انتظار دارد `days` حدود یک روز باشد، پس نام سفارشی کمتر غافلگیر می‌کند. دوم، تعریف دوبارهٔ `default` عمر هر scope را که `cacheLife` ندارد تغییر می‌دهد، که برای یک ویرایش config دامنهٔ اثر بزرگی است.

## رفتارهای دیگری که باید بدانید

- `cacheLife` باید داخل scope ِ cache صدا زده شود، نه در سطح ماژول؛ آنجا خطا می‌دهد.
- آن را در همان تابعی صدا بزنید که دایرکتیو را دارد. مستندات از پنهان‌کردنش در یک helper مشترک پرهیز می‌دهند.
- می‌توان آن را در شاخه‌های مختلف صدا زد، ولی در هر اجرا فقط یک فراخوانی باید انجام شود. این اجازه می‌دهد برای پست ناموجود `cacheLife("minutes")` و برای پست منتشرشده `cacheLife("days")` بگذارید.
- برای عمرهایی که از داده خوانده می‌شوند، object inline بدهید، مثل `{ revalidate: post.revalidateSeconds ?? 3600 }`؛ `stale` و `expire` از `default` ارث می‌برند.
- `cacheLife({})` مقدارهای `default` را اعمال می‌کند، پس راهی برای انصراف نیست.

## مصالحه‌ها

عمر صریح یک خط برای هر scope هزینه دارد و تصمیمی را می‌طلبد که می‌شد عقب انداخت. هدف همین است، ولی یعنی بازبین‌ها باید بپرسند `hours` درست است یا نه، که پرسشی دربارهٔ محتواست و نه کد.

ارث‌بری همیشه غلط نیست. کامپوننت برگی که فقط داخل والدی رندر می‌شود که عمرش را قفل کرده، برای امن بودن به فراخوانی خودش نیاز ندارد و یک نمونهٔ آزمایشی دور ریختنی روی `default` مشکلی ندارد. این قاعده بیشتر در مرزهایی اهمیت دارد که یک route، layout یا کامپوننت قابل استفادهٔ مجدد cache را شروع می‌کند، چون عمر این scopeها را دیگران به آن تکیه می‌دهند.

در نهایت، صریح بودن به معنای درست بودن نیست. `expire: never` در `default` یعنی ورودی‌ای که کسی درخواستش نکند فقط با گذشت زمان حذف نمی‌شود، پس scopeهایتان را با `cacheTag` برچسب بزنید و هنگام نوشتن داده invalidate کنید، به‌جای اینکه منتظر `revalidate` بمانید.

## منابع

- [مستندات Next.js: `cacheLife`](https://nextjs.org/docs/app/api-reference/functions/cacheLife)
- [فهرست وبلاگ Next.js](https://nextjs.org/blog)
- [انتشارهای vuejs/core](https://github.com/vuejs/core/releases)
- [انتشارهای vitejs/vite](https://github.com/vitejs/vite/releases)
