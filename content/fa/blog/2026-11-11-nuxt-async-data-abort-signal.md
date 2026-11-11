---
title: "نکته‌ی Nuxt: signal را از useAsyncData به $fetch پاس بدهید، وگرنه dedupe از نوع cancel چیزی را لغو نمی‌کند"
description: "useAsyncData به‌طور پیش‌فرض dedupe: 'cancel' دارد، اما لغو فقط وقتی به شبکه می‌رسد که handler شما signal را پاس بدهد. اتصال درست، همراه با timeout و clear."
date: 2026-11-11
cover: /images/blog/2026-11-11-nuxt-async-data-abort-signal.svg
tags: [nuxt, pro-tip, data-fetching]
draft: false
---

در ۷۲ ساعت گذشته جز انتشارهای وصله‌ای خبر مهمی نبود، پس امروز یک نکته‌ی کاربردی داریم. موضوع پیش‌فرضی است که احتمالاً به آن تکیه کرده‌اید بدون اینکه راستی‌آزمایی‌اش کنید: `useAsyncData` و `useFetch` چطور درخواست‌های منسوخ‌شده را لغو می‌کنند.

## اشتباه رایج

یک کادر جست‌وجو، پنل فیلتر یا جدول صفحه‌بندی‌شده را در نظر بگیرید که `refresh()` را صدا می‌زند یا کلید watch‌شده را سریع‌تر از پاسخ سرور عوض می‌کند. فرض می‌کنید درخواست قدیمی لغو می‌شود. با handler زیر، فقط نیمی از این فرض درست است:

```ts
const query = ref("");

const { data, status } = await useAsyncData(
    "search",
    () => $fetch("/api/search", { query: { q: query.value } }),
    { watch: [query] },
);
```

[مرجع `useAsyncData`](https://nuxt.com/docs/4.x/api/composables/use-async-data) گزینه‌ی `dedupe` را سیاستِ زمانی که یک اجرا بیش از یک بار هم‌زمان فعال می‌شود توصیف می‌کند، با دو مقدار `'cancel'` و `'defer'` و پیش‌فرض `'cancel'`. همچنین مستند کرده که `signal` در handler زمانی abort می‌شود که درخواست جدیدی با `dedupe: 'cancel'` شروع شود. handler بالا هرگز این signal را نمی‌خواند، پس چیزی به درخواست HTTP وصل نیست. Nuxt می‌تواند فراخوانی قدیمی را منسوخ علامت بزند، اما مرورگر اتصال را باز نگه می‌دارد و سرور شما روی کوئری‌ای کار می‌کند که کسی دیگر آن را نمی‌خواهد.

## چرا مهم است

هر handler دو آرگومان می‌گیرد: `nuxtApp` و یک شیء گزینه که یک `AbortSignal` دارد. نوع مستندشده:

```ts
type AsyncDataHandler<ResT> = (
    nuxtApp: NuxtApp,
    options: { signal: AbortSignal },
) => Promise<ResT>;
```

مستندات می‌گویند `$fetch` به‌صورت بومی از abort signal پشتیبانی می‌کند، پس پاس دادن signal کافی است. بدون آن، «cancel» فقط حسابداری سمت Nuxt است. با آن، درخواست واقعاً abort می‌شود.

برای typeahead که با هر کلید درخواست می‌فرستد، تفاوت به بار واقعی سرور و پهنای باند در اتصال‌های کند موبایل برمی‌گردد، نه یک پاکیزگی نظری. اینجا بنچمارک نگرفته‌ام؛ نکته فقط این است که signal پاس‌داده‌نشده کار را در حال اجرا رها می‌کند.

## الگوی بهتر

آرگومان دوم را بگیرید و به `$fetch` بدهید:

```ts
const query = ref("");

const { data, status } = await useAsyncData(
    "search",
    (_nuxtApp, { signal }) => $fetch("/api/search", { query: { q: query.value }, signal }),
    { watch: [query] },
);
```

[راهنمای data fetching](https://nuxt.com/docs/4.x/getting-started/data-fetching) در مثال‌های خودش همین شکل را به کار می‌برد: `signal` از آرگومان دوم handler به `$fetch` پاس داده می‌شود.

اگر از `useFetch` استفاده می‌کنید، معمولاً لازم نیست خودتان این کار را بکنید. [مرجع `useFetch`](https://nuxt.com/docs/4.x/api/composables/use-fetch) آن را پوششی روی `useAsyncData` و `$fetch` توصیف می‌کند و همان گزینه‌ی `dedupe` را با همان پیش‌فرض دارد. وقتی خودتان handler می‌نویسید این اتصال دستی اهمیت پیدا می‌کند: کلاینت سفارشی، فراخوانی GraphQL یا SDK‌ای که متد خودش را عرضه می‌کند.

### وقتی کلاینت شما از signal پشتیبانی نمی‌کند

مستندات این حالت را هم پوشش می‌دهند: اگر handler از signal پشتیبانی نکند، می‌توانید به رویداد `abort` روی `signal` گوش بدهید و خودتان promise را reject کنید. این کار باعث می‌شود promise سمت Nuxt سریع تمام شود، اما نمی‌تواند کاری را که SDK شروع کرده متوقف کند. قبل از اینکه فرض کنید cancel یعنی لغو شد، بررسی کنید کلاینت signal می‌پذیرد یا نه.

## راه‌های دیگر abort شدن درخواست

طبق مرجع، signal در handler در سه موقعیت abort می‌شود:

- درخواست جدیدی با `dedupe: 'cancel'` شروع شود؛
- `clear` صدا زده شود؛
- مدت `timeout` از حد بگذرد.

پس وقتی signal پاس داده شده باشد، timeout تقریباً مجانی است:

```ts
const { data, error, refresh } = await useAsyncData(
    "report",
    (_nuxtApp, { signal }) => $fetch("/api/report", { signal }),
    { immediate: false },
);

// timeout is in milliseconds; undefined (the default) means no timeout
await refresh({ timeout: 5000 });
```

`timeout` کنار `dedupe` و `signal` بخشی از `AsyncDataExecuteOptions` است، پس می‌توانید آن را برای هر فراخوانی جدا تنظیم کنید. مرجع می‌گوید این گزینه در v4.2 اضافه شده، پس نسخه‌ی خودتان را بررسی کنید.

`clear` برای گذارهای شبیه unmount مناسب است، جایی که نتیجه دیگر لازم نیست: طبق مستندات فراخوانی‌های در انتظار را لغو می‌کند و `data` را به `undefined` (یا مقدار `default()` شما)، `error` را به `undefined` و `status` را به `idle` برمی‌گرداند. وقتی می‌خواهید داده‌ی کهنه روی صفحه بماند از آن استفاده نکنید؛ مستندات می‌گویند تغییر `enabled` از true به false درخواست در حال اجرا را بدون پاک کردن `data` لغو می‌کند.

## لغو بر اساس قصد کاربر

`refresh` یک `signal` از خودتان هم می‌پذیرد، که برای دکمه‌ی «لغو» روی یک گزارش یا خروجی کند به کار می‌آید:

```ts
let controller: AbortController | undefined;

function start() {
    controller = new AbortController();
    refresh({ signal: controller.signal });
}

function cancel() {
    controller?.abort();
}
```

این مثال همان نمونه‌ی مرجع است. فراخوانی `abort()` refresh در حال اجرا را abort می‌کند، به شرط اینکه handler signal خودش را پاس داده باشد.

## انتخاب بین cancel و defer

اینجا باید محتاط بود، چون مستندات کم‌حرف‌اند. مرجع `'defer'` را به‌عنوان یک مقدار فهرست می‌کند اما `dedupe` را فقط «سیاست زمانی که اجرا بیش از یک بار هم‌زمان فعال می‌شود» توصیف می‌کند و نمی‌گوید `defer` دقیقاً چه می‌کند. همچنین می‌گوید به‌صورت پیش‌فرض Nuxt صبر می‌کند یک `refresh` تمام شود تا بتواند دوباره اجرا شود، و این جمله را به `defer` ربط نمی‌دهد. من دقیق‌ترین رفتار را حدس نمی‌زنم.

چیزی که از رفتار مستندشده‌ی `cancel` می‌توان استنباط کرد:

- **`cancel` (پیش‌فرض)** برای ورودی‌هایی مناسب است که آخرین درخواست برنده است: جست‌وجو، فیلتر، مرتب‌سازی، و هر جا که پاسخ قدیمی به‌محض وجود درخواست جدید بی‌ارزش است.
- **`defer`** برای وضعیت مقابل وجود دارد، جایی که نمی‌خواهید راه‌اندازی دوم کار در حال اجرا را abort کند. پیش از تکیه بر آن، سورس را بخوانید یا روی نسخه‌ی خودتان آزمایش کنید، چون مستندات نمی‌گویند بر سر فراخوانی دوم چه می‌آید.

[راهنما](https://nuxt.com/docs/4.x/getting-started/data-fetching) همچنین می‌گوید `dedupe` از گزینه‌هایی است که می‌تواند بین فراخوانی‌هایی با کلید مشترک متفاوت باشد، پس می‌توانید برای یک دکمه `refresh({ dedupe: "defer" })` را بدون تغییر پیش‌فرض composable به کار ببرید.

## بده‌بستان‌ها و نکات احتیاطی

- **abort یعنی برگرداندن نیست.** signal انتظار کلاینت و معمولاً انتقال را متوقف می‌کند. تغییری که قبلاً به سرور رسیده ممکن است کامل شود. cancel را به‌عنوان سازوکار ایمنی برای نوشتن‌ها به کار نبرید.
- **abort ممکن است در برخی مسیرها به‌صورت خطا ظاهر شود.** بررسی کنید مدیریت خطای شما با فراخوانی لغوشده چه می‌کند تا درخواست منسوخ باعث چشمک زدن حالت خطا در UI نشود. مرجع توضیح نمی‌دهد `data` یا `error` برای فراخوانی لغوشده چه می‌شوند، پس در اپ خودتان راستی‌آزمایی کنید.
- **کلید پایدار هنوز مهم است.** لغو برای اجراهای همان کلید اعمال می‌شود. اگر کلید را از کوئری بسازید، کلید جدید یک ورودی جدید است نه درخواست منسوخ؛ پس آگاهانه بین کلید ثابت به‌همراه `watch` یا کلید reactive انتخاب کنید. راهنما هر دو را مستند کرده است.
- **الگوی اولیه گاهی مناسب است:** برای fetch یک‌باره‌ای که هرگز refresh یا watch نمی‌شود. چیزی نمی‌تواند آن را منسوخ کند، پس پاس دادن signal سود کمی دارد، هرچند هزینه‌ای هم ندارد.

## فهرست بررسی

1. در کدبیس دنبال handler‌های `useAsyncData(` بگردید که آرگومان دومشان را نادیده می‌گیرند.
2. `signal` را به `$fetch` یا هر کلاینتی که دارید پاس بدهید.
3. برای فراخوانی‌هایی که پشت upstream کند هستند `timeout` اضافه کنید.
4. برای هر فراخوانی تصمیم بگیرید آخرین درخواست برنده است (`cancel`) یا اولی باید تمام شود.

## منابع

- https://nuxt.com/docs/4.x/api/composables/use-async-data
- https://nuxt.com/docs/4.x/api/composables/use-fetch
- https://nuxt.com/docs/4.x/getting-started/data-fetching
- https://nuxt.com/blog
- https://nextjs.org/blog
- https://github.com/vitejs/vite/releases
- https://github.com/vuejs/core/releases
- https://devblogs.microsoft.com/typescript/
