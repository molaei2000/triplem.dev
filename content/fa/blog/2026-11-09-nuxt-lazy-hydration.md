---
title: "نکتهٔ حرفه‌ای Nuxt: hydration را با hydrate-on-visible به تعویق بیندازید و propهایی را بشناسید که بی‌صدا آن را خنثی می‌کنند"
description: "کامپوننت‌های Lazy در Nuxt propهای hydrate-on-* را می‌پذیرند. کدام استراتژی به چه کاری می‌خورد، چه شرط‌هایی hydration زودهنگام را تحمیل می‌کنند و گزینهٔ مربوط به payload."
date: 2026-11-09
cover: /images/blog/2026-11-09-nuxt-lazy-hydration.svg
tags: [nuxt, pro-tip, performance]
draft: false
---

در ۷۲ ساعت گذشته چیز مهمی منتشر نشد. [صفحهٔ releaseهای Vue](https://github.com/vuejs/core/releases) نسخهٔ 3.5.45 را به‌عنوان آخرین نسخهٔ پایدار و 3.6.0-rc.14 را به‌عنوان pre-release نشان می‌دهد. [صفحهٔ releaseهای Vite](https://github.com/vitejs/vite/releases) نسخهٔ 8.3.6 را نشان می‌دهد که یک patch است. هر دو patch یا RC هستند و ارزش یک پست را ندارند. نکتهٔ حرفه‌ایِ قبلی دربارهٔ Next.js بود، پس امروز نوبت Nuxt است: چطور برای کامپوننت‌هایی که کسی نگاهشان نمی‌کند هزینهٔ hydration نپردازیم.

همهٔ مطالب زیر با [مستندات کامپوننت‌ها در Nuxt 4.x](https://nuxt.com/docs/4.x/directory-structure/app/components) و [صفحهٔ قابلیت‌های آزمایشی](https://nuxt.com/docs/4.x/guide/going-further/experimental-features) تطبیق داده شده است.

## اشتباه رایج

یک صفحهٔ فرود یا قالب مقالهٔ بلند روی سرور رندر می‌شود و سپس کلاینت همهٔ کامپوننت‌های آن را hydrate می‌کند: فرم خبرنامه در فوتر، ویجت نظرات، ماشین‌حساب قیمت سه صفحه پایین‌تر، یا منوی کشویی مخصوص موبایل روی یک نمای دسکتاپ. هر کدام هزینهٔ hydration دارند، حتی کامپوننت‌هایی که شاید بازدیدکننده هرگز به آن‌ها نرسد.

بدون استراتژی hydration، با همهٔ آن‌ها یکسان رفتار می‌شود.

```vue
<template>
    <ArticleBody :post="post" />
    <!-- Hydrates on load, even if the visitor never scrolls here -->
    <CommentsPanel :post-id="post.id" />
    <NewsletterForm />
</template>
```

## الگوی بهتر

پیشوند `Lazy` و یک prop از خانوادهٔ `hydrate-*` اضافه کنید. propهای استراتژی روی کامپوننت‌هایی با پیشوند `Lazy` اعمال می‌شوند.

```vue
<template>
    <ArticleBody :post="post" />
    <LazyCommentsPanel :post-id="post.id" hydrate-on-visible />
    <LazyNewsletterForm hydrate-on-idle />
    <LazyMobileDrawer hydrate-on-media-query="(max-width: 768px)" />
</template>
```

مستندات هفت استراتژی را فهرست می‌کند و برای هر کامپوننت فقط یکی قابل استفاده است:

| Prop                    | زمان hydration                                                                      |
| ----------------------- | ----------------------------------------------------------------------------------- |
| `hydrate-on-visible`    | وقتی کامپوننت وارد viewport شود                                                     |
| `hydrate-on-idle`       | وقتی مرورگر بیکار باشد (یک عدد به‌عنوان حداکثر timeout می‌پذیرد)                    |
| `hydrate-on-interaction`| وقتی رویداد مشخصی رخ دهد؛ بدون مقدار، پیش‌فرض `pointerenter`، `click` و `focus` است |
| `hydrate-on-media-query`| وقتی پنجره با media query مطابقت کند                                                 |
| `hydrate-after`         | بعد از گذشتن تأخیر مشخصی بر حسب میلی‌ثانیه                                          |
| `hydrate-when`          | وقتی یک مقدار بولین که شما کنترل می‌کنید true شود                                   |
| `hydrate-never`         | هرگز                                                                                |

راهنمای خود مستندات برای انتخاب: `hydrate-when` برای کامپوننت‌هایی که شاید اصلاً لازم نشوند، `hydrate-after` برای آن‌هایی که می‌توانند مدتی ثابت صبر کنند و `hydrate-on-idle` برای آن‌هایی که می‌توانند تا بیکار شدن مرورگر صبر کنند. `hydrate-on-visible` انتخاب طبیعی برای بخش‌های پایین‌تر از صفحهٔ اول است.

هر کامپوننتِ با hydration تأخیری یک رویداد `hydrated` ارسال می‌کند که برای سنجیدن زمان واقعی فعال شدن استراتژی مفید است:

```vue
<script setup lang="ts">
function onHydrated() {
    performance.mark("comments-hydrated");
}
</script>

<template>
    <LazyCommentsPanel :post-id="post.id" hydrate-on-visible @hydrated="onHydrated" />
</template>
```

`hydrate-on-interaction` را برای هر چیزی که بازدیدکننده ممکن است سریع استفاده کند با احتیاط به کار ببرید: کامپوننت فقط بعد از رویداد hydrate می‌شود، پس بررسی کنید اولین کلیک در تنظیمات شما از دست نرود.

## شرط‌هایی که بی‌صدا آن را بی‌اثر می‌کنند

مستندات چند شرط را فهرست می‌کند. این‌ها در پروژه‌های واقعی بیشتر دردسر می‌سازند:

- **هر تغییر prop روی یک کامپوننتِ با hydration تأخیری، بلافاصله hydration را فعال می‌کند.** این شامل کامپوننت‌های `hydrate-never` هم می‌شود. اگر propی واکنشی بدهید که درست بعد از mount تغییر می‌کند (ساعت، مقدار «اکنون»، فیلدی در store که بعد از بارگذاری ثابت می‌شود)، تأخیر از بین می‌رود و فقط یک لایهٔ اضافه ساخته‌اید.
- **stateی که با `v-model` به اشتراک گذاشته شده.** به‌روزرسانی یک مدل در یک کامپوننت می‌تواند همهٔ کامپوننت‌های متصل به آن را hydrate کند؛ پس دو کامپوننت هم‌ردیف با یک مدل مشترک عملاً یک واحد hydration هستند.
- **فقط در template فایل‌های SFC.** propها باید مستقیم در template نوشته شوند. پخش کردن آن‌ها با `v-bind` از یک شیء کار نمی‌کند و import مستقیم از `#components` هم کار نمی‌کند.
- **برای محتوای بالای صفحه نه.** به تعویق انداختن hero یا ناوبری فقط تعامل‌پذیری را همان جایی که بازدیدکننده اول نگاه می‌کند عقب می‌اندازد.
- **`hydrate-never` را روی چیزی که تعاملی است به کار نبرید.** مخصوص خروجی واقعاً ایستا است.

نکتهٔ مرتبط از مستندات: اگر کامپوننت با `v-if="false"` به‌صورت شرطی رندر می‌شود، یک کامپوننت lazy معمولی ممکن است کافی باشد.

## سمت داده: stripNeverHydratedData

نتیجهٔ `useAsyncData` یا `useFetch` یک کامپوننت به‌صورت پیش‌فرض در payload قرار می‌گیرد، چه کامپوننت زود hydrate شود چه نه. صفحهٔ قابلیت‌های آزمایشی دو گزینهٔ مرتبط را مستند کرده است. `lazyHydration` به‌صورت پیش‌فرض فعال است و استراتژی‌های hydration را برای کامپوننت‌های `<Lazy>` روشن می‌کند، و `compilerComponentResolution` (آن هم پیش‌فرض فعال) propهای `hydrate-*` را هنگام کامپایل template اعمال می‌کند. اگر هنگام دیباگ بخواهید آن‌ها را کنار بگذارید، هر دو را می‌شود روی `false` گذاشت.

گزینهٔ سوم `stripNeverHydratedData` است. این گزینه `serialize: false` را روی فراخوانی‌های `useAsyncData` و `useFetch` داخل کامپوننت‌های `hydrate-never` اعمال می‌کند، پس داده‌شان از `__NUXT_DATA__` بیرون می‌ماند. اگر خودتان `serialize` را صریح تنظیم کنید، همان اولویت دارد. مثال مستندات آن را با `true` فعال می‌کند و پیش‌فرضی ذکر نمی‌کند، پس آن را اختیاری (opt-in) بدانید.

```ts
// nuxt.config.ts
export default defineNuxtConfig({
    experimental: {
        stripNeverHydratedData: true,
    },
});
```

این فقط برای محتوایی معنا دارد که واقعاً هرگز تعاملی نمی‌شود، مثل یک بلوک حقوقی رندرشده روی سرور یا فهرست ایستای پست‌های مرتبط. آزمایشی است، پس آن را پشت تستی بگذارید که صفحه را بارگذاری و خروجی را بررسی کند.

## مصالحه‌ها

- **تأخیر تعامل جابه‌جا می‌شود، حذف نمی‌شود.** با `hydrate-on-visible` کار هنگام رسیدن بازدیدکننده به کامپوننت انجام می‌شود. برای کامپوننت سنگین این می‌تواند هنگام اسکرول به‌شکل لکنت دیده شود. `hydrate-on-idle` هزینه را در زمان‌های بیکاری پخش می‌کند.
- **اول اندازه بگیرید.** پنل Performance را باز کنید، ببینید کدام کامپوننت‌ها بر hydration غالب‌اند و همان‌ها را به تعویق بیندازید. پوشاندن همه‌چیز فقط کد استراتژی و سطح خرابی اضافه می‌کند.
- **مسیر تأخیری را تست کنید.** رفتارهایی که به زنده بودن کامپوننت هنگام بارگذاری تکیه دارند (مدیریت focus، لینک‌های anchor به بخش نظرات، hookهای analytics) ممکن است با انتظار hydration خراب شوند.

الگوی اصلی کجا هنوز درست است: هر چیز بالای صفحه، هر چیزی که هنگام بارگذاری فوراً تعاملی است و هر کامپوننتی که propهایش زود تغییر می‌کند.

## منابع

- [Nuxt 4.x docs: components, delayed (lazy) hydration](https://nuxt.com/docs/4.x/directory-structure/app/components)
- [Nuxt 4.x docs: experimental features](https://nuxt.com/docs/4.x/guide/going-further/experimental-features)
- [vuejs/core releases](https://github.com/vuejs/core/releases)
- [vitejs/vite releases](https://github.com/vitejs/vite/releases)
- [Nuxt blog](https://nuxt.com/blog)
- [Next.js blog](https://nextjs.org/blog)
