---
title: "نکتهٔ حرفه‌ای Nuxt: به‌جای گاردهای دستی، useAsyncData را با enabled کنترل کنید"
description: "از Nuxt 4.5 گزینهٔ enabled واکشی اولیه، refresh و محرک‌های watch را یک‌جا مسدود می‌کند. ببینید کجا از immediate: false بهتر است و نقطهٔ تیزش چیست."
date: 2026-10-09
cover: /images/blog/2026-10-09-nuxt-enabled-option.svg
tags: [nuxt, pro-tip, data-fetching]
draft: true
---

در ۷۲ ساعت گذشته چیز مهمی منتشر نشد که پست‌های قبلی پوشش نداده باشند، پس امروز یک نکتهٔ حرفه‌ای داریم. موضوع گزینه‌ای کوچک است که یک خانواده از ترفندهای واکشی شرطی را حذف می‌کند: `enabled`. همهٔ مطالب زیر با مستندات فعلی Nuxt 4 برای [`useAsyncData`](https://nuxt.com/docs/4.x/api/composables/use-async-data) و [`useFetch`](https://nuxt.com/docs/4.x/api/composables/use-fetch) تطبیق داده شده است. مستندات `enabled` را از نسخهٔ v4.5 علامت زده‌اند، پس اول نسخهٔ خود را بررسی کنید.

## اشتباه رایج

درخواستی دارید که تا برقراری یک شرط نباید اجرا شود: کاربر وارد شده باشد، انتخابی وجود داشته باشد، یک feature flag روشن باشد. راه‌حل‌های معمول:

```ts
// 1. Guard inside the handler
const { data } = await useAsyncData("profile", () =>
    isLoggedIn.value ? $fetch("/api/profile") : null,
);

// 2. Defer and remember to fire it yourself
const { data, execute } = await useAsyncData("profile", () => $fetch("/api/profile"), {
    immediate: false,
});
watch(isLoggedIn, (v) => v && execute());
```

هر دو کار می‌کنند و هر دو نشت دارند. اولی باز هم handler را «اجرا» می‌کند: `status` به `pending` و `success` می‌رود و با `null` تمام می‌شود، که با «سرور چیزی برنگرداند» قابل تشخیص نیست. دومی فقط فراخوانی *اولیه* را مسدود می‌کند. `refresh()` بعدی یا یک محرک `watch` را `immediate: false` پوشش نمی‌دهد، پس گارد باید در هر محل فراخوانی تکرار شود.

## مستندات دربارهٔ enabled چه می‌گویند

`enabled` یک boolean، ref یا computed می‌پذیرد (`MaybeRefOrGetter<boolean>`) و پیش‌فرضش `true` است. مستندات آن را مانعی می‌نامند که تعیین می‌کند درخواست اجازهٔ اجرا دارد یا نه. تا وقتی `false` است سه چیز مسدود می‌شود:

- واکشی اولیه،
- فراخوانی‌های `execute` / `refresh`،
- محرک‌های `watch`.

تفاوتش با `immediate: false` همین است؛ طبق مستندات، آن گزینه فقط جلوی اجرای فوری درخواست را می‌گیرد و `status` را روی `idle` نگه می‌دارد.

```vue
<script setup lang="ts">
const isLoggedIn = ref(false);

const { data, execute } = useAsyncData(
    "profile",
    (_nuxtApp, { signal }) => $fetch("/api/profile", { signal }),
    { enabled: isLoggedIn },
);
</script>
```

تا وقتی `isLoggedIn` برابر `true` نشود handler مسدود است. چون ref است، گارد واکنشی می‌ماند و لازم نیست فراخوانی را از نو بسازید.

## نقطهٔ تیز: فعال‌سازی دوباره واکشی نمی‌کند

این بخش را حتماً به خاطر بسپارید. مستندات صریح می‌گویند: فعال‌سازی دوباره خودبه‌خود refetch نمی‌کند. تغییر پرچم از `false` به `true` فقط دروازه را باز می‌کند و بیشتر نه. باید خودتان درخواست را راه بیندازید، با `execute()` یا با تغییر یک منبع `watch` پس از آن:

```ts
isLoggedIn.value = true;
await execute(); // required: the gate opening is not a trigger
```

اگر انتظار داشتید `enabled` مثل یک «وقتی true شد واکشی کن» اعلانی رفتار کند، اینطور نیست. آن را مجوز بدانید، نه محرک. اگر واکشی خودکار با تغییر پرچم می‌خواهید، آن را با یک منبع watch که همزمان تغییر می‌کند جفت کنید، یا `execute()` را از کدی صدا بزنید که پرچم را عوض می‌کند.

گذار برعکس مهربان‌تر است. رفتن از `true` به `false` هر درخواست در حال انجام را لغو می‌کند ولی `data` را سر جایش می‌گذارد. برای جریان خروج کاربر مفید است، جایی که می‌خواهید درخواست معلق متوقف شود بی‌آنکه UI وسط گذار خالی شود. اگر داده باید پاک شود، خودتان پاکش کنید.

توجه کنید که handler در مثال، `signal` را از آرگومان دوم می‌گیرد و به `$fetch` می‌دهد. این همان الگوی مستندات است و باعث می‌شود لغو درخواست در حال انجام واقعاً درخواست شبکه را قطع کند، نه اینکه فقط نتیجه نادیده گرفته شود.

## کدام را کی انتخاب کنیم

| نیاز | استفاده |
| --- | --- |
| اجرا فقط پس از یک شرط، و مسدود بودن *همهٔ* مسیرها (refresh، watcher) تا آن زمان | `enabled` |
| رد کردن اجرای اول، ولی اجازهٔ `execute()` دستی | `immediate: false` |
| هرگز روی سرور واکشی نکن | `server: false` (طبق مستندات `status` هنگام رندر سرور `idle` است) |
| اصلاً درخواست نده و مصرف‌کننده را mount نکن | `v-if` روی کامپوننت |

`immediate: false` همچنان ابزار درست است وقتی اولین فراخوانی عمداً به کاربر وابسته است، مثلاً دکمهٔ «بارگذاری بیشتر»، چون می‌خواهید `execute()` بی‌قید کار کند. `enabled` برای یک *پیش‌شرط* درست است، جایی که تا برآورده نشدنش نباید چیزی اجرا شود.

## تعامل با watcherها

در `useFetch` گزینه‌هایی که به‌صورت `ref` یا `computed` داده شوند به‌طور پیش‌فرض watch می‌شوند و `watch: false` آن را متوقف می‌کند. با `enabled: false` این محرک‌ها هم خنثی می‌شوند. برای الگوی معمول کوئری وابسته ترکیبشان کنید:

```ts
const userId = ref<string | null>(null);

const { data: orders, status } = useFetch("/api/orders", {
    query: { userId },
    enabled: () => userId.value !== null,
});
```

getter کار می‌کند چون نوع گزینه `MaybeRefOrGetter<boolean>` است. تا وقتی `userId` برابر `null` است چیزی درخواست نمی‌شود. پس از مقداردهی، گزینهٔ query تغییر می‌کند. اینکه این تغییر به‌تنهایی بعد از یک دورهٔ مسدودی درخواست را راه می‌اندازد یا نه، همان پرسش فعال‌سازی دوباره است؛ پس پیش از اتکا به آن، رفتار را با یک تست در جریان خودتان بسنجید. مستندات فقط قول می‌دهند که فعال‌سازی دوباره خودبه‌خود refetch نمی‌کند.

## بده‌بستان‌ها و هشدارها

- **حداقل نسخه.** `enabled` از 4.5 به بعد است. در 4.x قدیمی‌تر یا Nuxt 3 از `immediate: false` به‌علاوهٔ یک گارد صریح استفاده کنید. جدول نسخه‌های مستندات `enabled` را v4.5، `timeout` را v4.2 و `dedupe` را v3.9 ذکر می‌کند.
- **`status` را در حالت مسدود بررسی کنید.** مستندات نمی‌گویند درخواست مسدود چه `status` ای گزارش می‌کند، پس در نسخهٔ خودتان بسنجید. می‌گویند `idle` یعنی درخواست شروع نشده، و `pending` هم وقتی `status` برابر `idle` است و داده‌ای در کش نیست `true` می‌شود، آن هم فقط اگر `experimental.pendingWhenIdle` فعال باشد.
- **تعیین کنید مالک گارد کیست.** گارد گزینه‌ای روی هر فراخوانی است. اگر چند کامپوننت یک کلید را به اشتراک می‌گذارند، توافق کنید کدام `enabled` را تنظیم می‌کند. پست قبلی دربارهٔ [کلیدهای مشترک](/fa/blog/2026-10-04-nuxt-async-data-shared-keys) را ببینید.
- **مرز امنیتی نیست.** `enabled` فقط جلوی درخواست کلاینت را می‌گیرد. احراز مجوز همچنان جایش روی مسیر سرور است.

## جمع‌بندی

پیش‌شرط‌ها را از handlerها و watcherها به `enabled` ببرید. یک اعلان دارید که واکشی اولیه، refreshهای دستی و refetchهای ناشی از watcher را مسدود می‌کند، و دیگر «هنوز داده‌ای نیست» را به‌صورت `success` با مقدار `null` کد نمی‌کنید. فقط یادتان باشد باز شدن دروازه محرک نیست: وقتی شرط برقرار شد `execute()` را صدا بزنید.

## منابع

- [useAsyncData, Nuxt docs](https://nuxt.com/docs/4.x/api/composables/use-async-data)
- [useFetch, Nuxt docs](https://nuxt.com/docs/4.x/api/composables/use-fetch)
- [Nuxt releases on GitHub](https://github.com/nuxt/nuxt/releases)
- [Vue core releases on GitHub](https://github.com/vuejs/core/releases)
