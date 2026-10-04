---
title: "نکته حرفه‌ای Nuxt: کنترل کش سمت کلاینت با getCachedData و کلیدهای صریح"
description: "Nuxt به‌طور پیش‌فرض داده کش‌شده را فقط هنگام hydration استفاده می‌کند. با کلید صریح، getCachedData و آرگومان cause یک کش واقعی سمت کلاینت بسازید."
date: 2026-10-03
cover: /images/blog/2026-10-03-nuxt-get-cached-data.svg
tags: [nuxt, data-fetching, pro-tip]
draft: true
---

در ۷۲ ساعت گذشته خبر مهمی که با تمرکز این وبلاگ بخواند منتشر نشد؛ به همین دلیل پست امروز یک نکته حرفه‌ای است. موضوع، یک غافلگیری رایج در data fetching نیت است: `useFetch` را برای یک منبع در دو جا صدا می‌زنید یا از صفحه خارج و دوباره وارد می‌شوید، و درخواست دوباره ارسال می‌شود. این‌که چنین شود به سه چیز بستگی دارد که در اختیار شماست: کلید، گزینه `getCachedData` و سیاست `dedupe`.

## اشتباه رایج

دو کامپوننت یک لیست را با `useFetch` ساده می‌گیرند:

```ts
// ComponentA.vue
const { data } = await useFetch("/api/users");

// ComponentB.vue
const { data } = await useFetch("/api/users");
```

طبیعی است که فرض کنیم این دو یک درخواست را به اشتراک می‌گذارند، اما این‌طور نیست. [راهنمای data fetching](https://nuxt.com/docs/4.x/getting-started/data-fetching) می‌گوید `useFetch` کلید خود را از URL، گزینه‌های fetch و محل فراخوانی در کد تولید می‌کند. پس دو فراخوانی با یک URL در دو کامپوننت کلیدهای متفاوت دارند و هرکدام درخواست جداگانه می‌زنند.

فرض دوم این است که داده پس از دریافت کش می‌ماند و بازگشت به صفحه رایگان است. این هم پیش‌فرض نیست، همان‌طور که در بخش بعد می‌بینید.

## کش پیش‌فرض واقعاً چه می‌کند

طبق [مرجع `useAsyncData`](https://nuxt.com/docs/4.x/api/composables/use-async-data)، `getCachedData` پیش‌فرض این‌شکل است:

```ts
const getDefaultCachedData = (key, nuxtApp, ctx) =>
    nuxtApp.isHydrating ? nuxtApp.payload.data[key] : nuxtApp.static.data[key];
```

هنگام hydration از payload سرور می‌خواند، که همان چیزی است که پس از SSR از درخواست مجدد در کلاینت جلوگیری می‌کند. پس از آن از `nuxtApp.static.data` می‌خواند. [صفحه `useFetch`](https://nuxt.com/docs/4.x/api/composables/use-fetch) اضافه می‌کند که این فقط وقتی فعال است که `experimental.payloadExtraction` روشن باشد. در عمل، پیش‌فرض یک بهینه‌سازی برای hydration و payload ایستا است و کش عمومی سمت کلاینت نیست؛ بنابراین ناوبری عادی سمت کلاینت به صفحه‌ای که `useFetch` دارد، handler را دوباره اجرا می‌کند.

این پیش‌فرض منطقی است، چون داده کهنه بدتر از یک درخواست اضافه است. اما برای داده‌ای که به‌ندرت تغییر می‌کند (دسته‌بندی‌ها، فهرست امکانات، پروفایل کاربر) ممکن است بخواهید استفاده مجدد را فعال کنید.

## راه‌حل ۱: کلیدهای صریح و مشترک

اگر چند کامپوننت به یک داده نیاز دارند، کلید یکسان بدهید. طبق [راهنمای data fetching](https://nuxt.com/docs/4.x/getting-started/data-fetching)، فراخوانی‌های با کلید مشترک refهای `data`، `error` و `status` را به اشتراک می‌گذارند:

```ts
// composables/useUsers.ts
export function useUsers() {
    return useAsyncData("users", () => $fetch("/api/users"));
}
```

پیچیدن در یک composable مهم است. مستندات گزینه‌هایی را نام می‌برد که باید بین فراخوانی‌های هم‌کلید یکسان بمانند: handler، `deep`، `transform`، `pick`، `getCachedData` و `default`. تفاوت در آن‌ها هشدار توسعه ایجاد می‌کند. گزینه‌هایی مثل `server`، `lazy`، `immediate`، `dedupe` و `watch` می‌توانند متفاوت باشند. یک composable تضمین می‌کند مجموعه گزینه‌های یکسان فقط یک‌بار نوشته شود.

## راه‌حل ۲: فعال‌سازی کش کلاینت با getCachedData

`getCachedData` آرگومان‌های `(key, nuxtApp, ctx)` را می‌گیرد و `ctx.cause` دلیل اجرای fetch را نشان می‌دهد: `'initial'`، `'refresh:manual'`، `'refresh:hook'` یا `'watch'`. برگرداندن یک مقدار، handler را رد می‌کند و برگرداندن `undefined` اجازه اجرا می‌دهد.

کشی که در بارگذاری اولیه و ناوبری داده را برمی‌گرداند، اما refresh صریح و تغییر منابع watch را رعایت می‌کند:

```ts
export function useUsers() {
    const nuxtApp = useNuxtApp();
    return useAsyncData("users", () => $fetch("/api/users"), {
        getCachedData(key, nuxtApp, ctx) {
            // An explicit refresh or a watched source change must hit the network.
            if (ctx.cause === "refresh:manual" || ctx.cause === "watch") {
                return undefined;
            }
            return nuxtApp.isHydrating ? nuxtApp.payload.data[key] : nuxtApp.static.data[key];
        },
    });
}
```

این نسخه فقط پیش‌فرض را بازتولید می‌کند و بررسی `cause` را صریح می‌کند. برای رفتن جلوتر باید مقداری از store خودتان برگردانید. توجه کنید که طراحی handler و منبع کش با شماست: مستندات امضا و مقادیر `cause` را مشخص می‌کنند، نه یک پیاده‌سازی کش مشخص. اگر کش خودتان را نگه دارید، ابطال و انقضای آن هم با شماست.

## راه‌حل ۳: نمایش داده کش‌شده هنگام دریافت مجدد

اگر ترجیح می‌دهید همیشه دوباره دریافت کنید ولی صفحه خالی نشان ندهید، [`useNuxtData`](https://nuxt.com/docs/4.x/api/composables/use-nuxt-data) مقدار کش‌شده فعلی یک کلید را می‌خواند و refی برمی‌گرداند که در نبود کش `undefined` است:

```ts
const { data: cachedUsers } = useNuxtData("users");

const { data: users } = await useAsyncData("users", () => $fetch("/api/users"), {
    default: () => cachedUsers.value,
});
```

مستندات این را الگوی placeholder کش‌شده می‌نامد و هشدار اصلی این است که composable اصلی باید با کلید صریح صدا زده شده باشد. همان صفحه به‌روزرسانی خوش‌بینانه را هم شرح می‌دهد: مقدار کش قبلی را نگه دارید، خوش‌بینانه به‌روز کنید و اگر درخواست شکست خورد برگردانید.

## Dedupe: درخواست‌های همزمان مسئله‌ای جداست

کش و حذف تکرار یکی نیستند. `dedupe` تعیین می‌کند وقتی یک کلید درخواست می‌شود و درخواست قبلی هنوز در جریان است چه رخ دهد. مقدار آن `'cancel'` (پیش‌فرض) یا `'defer'` است. با `cancel` فراخوانی جدید درخواست در جریان را لغو می‌کند. با `defer` فراخواننده‌ها به‌جای شروع درخواست تازه، منتظر درخواست در جریان می‌مانند. اگر چند کامپوننت همزمان mount شوند و یک کلید را بخواهند، `defer` از کار موازی جلوگیری می‌کند؛ `cancel` وقتی بهتر است که آخرین پارامترها باید برنده شوند، مثل ورودی جست‌وجو.

handler همچنین یک `AbortSignal` را به‌صورت `options.signal` دریافت می‌کند، پس اگر آن را منتقل کنید درخواست‌های لغوشده واقعاً فراخوانی زیرین را قطع می‌کنند.

## ابطال کش

وقتی کش می‌کنید، راه خروج هم لازم است. راهنما دو ابزار سراسری نام می‌برد: `refreshNuxtData` بر اساس کلید دوباره دریافت می‌کند و `clearNuxtData` داده کش‌شده را باطل می‌کند. `refresh()` و `execute()` در سطح هر نمونه هم کار می‌کنند. بعد از mutationها از آن‌ها استفاده کنید تا لیست کش‌شده بیشتر از نوشتنی که آن را تغییر داده زنده نماند.

## موازنه‌ها و زمان‌هایی که نباید این کار را کرد

- **کهنگی.** کش کلاینتی که هرگز منقضی نمی‌شود داده قدیمی نشان می‌دهد. فقط برای داده‌ای فعالش کنید که این قابل قبول است، یا بررسی زمانی خودتان را اضافه کنید.
- **داده مخصوص هر کاربر.** پاسخ‌های هر کاربر را با کلید ایستای مشترک ذخیره نکنید، مگر این‌که کش به همان کاربر محدود باشد.
- **قواعد یکسانی.** تغییر `transform`، `pick` یا `default` فقط در یکی از فراخوانی‌های هم‌کلید، هشدار و state مشترک غیرمنتظره ایجاد می‌کند.
- **پیش‌فرض را نگه دارید** وقتی داده باید در هر ناوبری تازه باشد. در آن حالت پیش‌فرض درست است و درخواست اضافه بهای درستی است.

## منابع

- [Data fetching, Nuxt docs](https://nuxt.com/docs/4.x/getting-started/data-fetching)
- [useAsyncData, Nuxt docs](https://nuxt.com/docs/4.x/api/composables/use-async-data)
- [useFetch, Nuxt docs](https://nuxt.com/docs/4.x/api/composables/use-fetch)
- [useNuxtData, Nuxt docs](https://nuxt.com/docs/4.x/api/composables/use-nuxt-data)
