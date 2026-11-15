---
title: "نکتهٔ حرفه‌ای Nuxt: $fetch روی سرور کوکی‌ها را فوروارد نمی‌کند؛ برای فراخوانی‌های احرازهویت‌شده از useFetch یا useRequestFetch استفاده کنید"
description: "در SSR یک $fetch ساده کوکی‌های بازدیدکننده را رها می‌کند و صفحه با HTML کاربر مهمان رندر می‌شود. تفاوت useFetch، useRequestFetch و useRequestHeaders و اینکه چه چیزی را فوروارد کنیم."
date: 2026-11-15
cover: /images/blog/2026-11-15-nuxt-request-fetch-cookies.svg
tags: [nuxt, pro-tip, data-fetching]
draft: false
---

در ۷۲ ساعت گذشته چیز قابل‌توجهی منتشر نشد که یک مقالهٔ کامل بخواهد: تازه‌ترین نسخه‌های Vite وصله‌های 8.x هستند و آخرین نوشتهٔ [وبلاگ Nuxt](https://nuxt.com/blog) مربوط به اکتبر است. برای همین این یک نکتهٔ حرفه‌ای است دربارهٔ دسته‌ای از باگ‌ها که هرگز در مرورگر دیده نمی‌شوند: فراخوانی API احرازهویت‌شده‌ای که در ناوبری سمت کلاینت درست کار می‌کند ولی در HTML سرور به صورت «خارج‌شده از حساب» رندر می‌شود.

## اشتباه

```vue
<script setup lang="ts">
// Runs on the server on first load, in the browser on navigation
const me = await $fetch("/api/me");
</script>
```

در همین دو خط دو مشکل پنهان است و علت‌هایشان فرق دارد.

**۱. نبودن کوکی روی سرور.** در مرورگر، درخواست خودکار کوکی‌های کاربر را همراه دارد. در رندر سمت سرور مرورگری وجود ندارد؛ خود سرور درخواست را می‌فرستد. طبق [مستندات data fetching](https://nuxt.com/docs/4.x/getting-started/data-fetching)، به دلایل امنیتی `$fetch` در SSR کوکی‌های مرورگر کاربر را شامل نمی‌شود. بنابراین `/api/me` یک درخواست ناشناس می‌بیند، سرور حالت ناشناس را رندر می‌کند و صفحه فقط اگر کدی در کلاینت دوباره داده را بگیرد درست می‌شود. در بهترین حالت یک پرش محتوای اشتباه و در بدترین حالت hydration mismatch.

**۲. دوبار واکشی.** همین مستندات هشدار می‌دهند که صدا زدن `$fetch` در setup کامپوننت ممکن است داده را دو بار بگیرد، یک بار روی سرور و یک بار هنگام hydration، و می‌تواند مشکل hydration بسازد. `useFetch` و `useAsyncData` با انتقال نتیجهٔ سرور به کلاینت از طریق payload این مشکل را ندارند. `$fetch` برای فراخوانی‌های فقط‌کلاینت و رویدادمحور است (کلیک دکمه، ارسال فرم).

## راه‌حل حالت رایج: `useFetch`

```vue
<script setup lang="ts">
const { data: me } = await useFetch("/api/me");
</script>
```

هر دو مشکل با هم حل می‌شود. طبق مستندات، `useFetch` روی سرور از [`useRequestFetch`](https://nuxt.com/docs/4.x/api/composables/use-request-fetch) برای فوروارد کردن هدرها و کوکی‌های کلاینت استفاده می‌کند، به‌جز هدرهایی که قرار نیست فوروارد شوند، مثل `host`. نتیجه با payload منتقل می‌شود و در hydration درخواست دومی نیست.

اگر کلید سفارشی، transform یا گزینه‌های دیگر می‌خواهید، `useAsyncData` همان رفتار payload را دارد، اما فوروارد کردن با خودتان است (بخش بعد).

## وقتی باید خودتان `$fetch` را صدا بزنید

داخل `useAsyncData`، در یک action از Pinia که هنگام SSR اجرا می‌شود یا در یک plugin، از `useFetch` عبور نمی‌کنید. از `useRequestFetch` استفاده کنید:

```ts
const requestFetch = useRequestFetch();

const { data: me } = await useAsyncData("me", () => requestFetch("/api/me"));
```

طبق مستندات، `requestFetch` روی سرور زمینه و هدرهای درخواست ورودی را فوروارد می‌کند. در مرورگر مثل `$fetch` معمولی رفتار می‌کند، پس همین کد در هر دو طرف کار می‌کند. مثال خود مستندات، مسیری را با `requestFetch` صدا می‌زند و نشان می‌دهد آن مسیر می‌تواند کوکی‌ها را با `parseCookies` بخواند، در حالی که با `$fetch` ساده چیزی نمی‌گیرد.

`useRequestFetch()` را جایی صدا بزنید که composableها مجازند (setup، plugin، route middleware) و نه داخل callback بعد از یک `await`. این رفتار عمومی زمینهٔ composable در Nuxt است؛ در کد بالا در setup و پیش از شروع کار async صدا زده شده است.

## فقط آنچه لازم است: `useRequestHeaders`

اگر فقط چند هدر مشخص را می‌خواهید فوروارد کنید، [`useRequestHeaders`](https://nuxt.com/docs/4.x/api/composables/use-request-headers) آرایه‌ای از نام‌ها می‌گیرد:

```ts
const headers = useRequestHeaders(["cookie"]);

async function getCurrentUser() {
    return await $fetch("/api/me", { headers });
}
```

مستندات این را فقط وقتی لازم می‌دانند که از `useFetch` استفاده نمی‌کنید. روی کلاینت یک شیء خالی برمی‌گرداند، پس فراخوانی به یک درخواست عادی مرورگر تبدیل می‌شود که مرورگر خودش کوکی‌ها را می‌چسباند.

با یک فهرست کوتاه مجاز استفاده کنید. بدون آرگومان تمام هدرهای ورودی را برمی‌گرداند و دادن آن به یک origin دیگر راه نشت اعتبارنامه‌هاست.

## با میزبان‌های ثالث محتاط باشید

مستندات دربارهٔ فوروارد کردن هدرها به API خارجی هشدار می‌دهند. فوروارد کردن `cookie` یا `authorization` به میزبانی که کنترل نمی‌کنید، نشست بازدیدکننده را به آن میزبان می‌دهد. این الگوها را جدا نگه دارید:

- مسیرهای Nitro خودتان، همان origin: با `useFetch` یا `useRequestFetch` فوروارد کنید.
- بک‌اندی که مال خودتان است ولی روی origin دیگری: فقط هدر مشخصی را که لازم دارد و فقط اگر آن بک‌اند به برنامهٔ شما اعتماد دارد.
- API ثالث: هرگز کوکی بازدیدکننده را فوروارد نکنید؛ آن را از یک مسیر Nitro با اعتبارنامهٔ سمت سرور صدا بزنید.

مستندات data fetching هدرهایی را هم نام می‌برند که نباید پروکسی شوند: `host`، `accept`، `content-length`، `content-md5`، `content-type`، `x-forwarded-host`، `x-forwarded-port`، `x-forwarded-proto`، `cf-connecting-ip` و `cf-ray`. صفحهٔ `useRequestFetch` مجموعهٔ کمی متفاوت را به‌عنوان فوروارد‌نشده نام می‌برد (`transfer-encoding`، `connection`، `keep-alive`، `upgrade`، `expect`، `host`، `accept`). این دو فهرست به دو پرسش متفاوت جواب می‌دهند، یکی دربارهٔ آنچه خودتان نباید دستی کپی کنید و دیگری دربارهٔ آنچه helper رد می‌کند، و هیچ‌کدام ادعای کامل بودن ندارند. اگر فوروارد را خودتان می‌نویسید، از فهرست مجاز شروع کنید، نه از کپی همه‌چیز و حذف چند مورد.

## جهت مخالف: `Set-Cookie`

فوروارد فقط یک‌طرفه است. اگر یک درخواست داخلی روی سرور `Set-Cookie` برگرداند (مثلاً نشست تازه‌شده)، مرورگر بازدیدکننده آن را نمی‌گیرد مگر خودتان رد کنید. مستندات این الگو را نشان می‌دهند:

```ts
import type { H3Event } from "h3";

export const fetchWithCookie = async (event: H3Event, url: string) => {
    const res = await $fetch.raw(url);
    const cookies = res.headers.getSetCookie();
    for (const cookie of cookies) {
        appendResponseHeader(event, "set-cookie", cookie);
    }
    return res._data;
};
```

این کد سمت سرور است و به `event` نیاز دارد، پس جایش یک utility سرور یا helper آگاه از Nitro است، نه کد کامپوننت.

## مصالحه‌ها

- **`useFetch` رایگان نیست.** نتیجه را در payload سریالایز می‌کند. برای پاسخ‌های بزرگ با `pick` یا `transform` کوچکش کنید؛ [نکتهٔ payload](/fa/blog/2026-10-28-nuxt-payload-pick-transform) را ببینید.
- **داده‌ٔ هر کاربر و کش مشترک با هم نمی‌خوانند.** وقتی صفحه به کوکی‌های فورواردشده وابسته است، کش کردن HTML یا پاسخ API برای همه باگ درستی است. این مسیرها را از قوانین کش مشترک دور نگه دارید.
- **فقط‌کلاینت جواب معتبری است.** اگر داده خصوصی است، برای SEO لازم نیست و حالت loading قابل‌قبول است، واکشی فقط در مرورگر، از event handler یا بعد از mount، سؤال را حذف می‌کند. اولین نمایش معنادار سریع‌تر را با رفتار ساده‌تر سرور معاوضه می‌کنید.

## کجا `$fetch` ساده هنوز درست است

- event handlerها: کلیک، ارسال، tick پولینگ، که همه در مرورگر اجرا می‌شوند.
- کد سرور که عمداً فراخوانی ناشناس یا با اعتبارنامهٔ سرویس می‌زند، مثل مسیر Nitro که API ثالث را صدا می‌زند.
- داده‌های عمومی بدون زمینهٔ کاربر، هرچند حتی آن‌جا `useFetch` از درخواست دوم جلوگیری می‌کند.

## یک بررسی سریع

برای گرفتن این دسته از باگ‌ها، صفحهٔ احرازهویت‌شده را با غیرفعال‌کردن جاوااسکریپت باز کنید یا source صفحه را ببینید. اگر HTML سرور حالت مهمان را نشان می‌دهد و حالت درست فقط بعد از hydration ظاهر می‌شود، احتمالاً یک `$fetch` ساده (یا فراخوانی‌ای که کوکی فوروارد نمی‌کند) علت است.

## منابع

- https://nuxt.com/blog
- https://nuxt.com/docs/4.x/getting-started/data-fetching
- https://nuxt.com/docs/4.x/api/composables/use-request-fetch
- https://nuxt.com/docs/4.x/api/composables/use-request-headers
- https://github.com/vitejs/vite/releases
- https://nextjs.org/blog
