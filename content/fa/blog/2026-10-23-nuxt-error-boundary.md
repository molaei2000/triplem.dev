---
title: "نکتهٔ حرفه‌ای Nuxt: خطای ویجت‌ها را با NuxtErrorBoundary مهار کنید، نه با صفحهٔ خطای تمام‌صفحه"
description: "خرابیِ یک ویجت نباید کل صفحه را عوض کند. NuxtErrorBoundary، clearError، createError و هوک vue:error چطور مسئولیت را تقسیم می‌کنند و هرکدام کجا متوقف می‌شوند."
date: 2026-10-23
cover: /images/blog/2026-10-23-nuxt-error-boundary.svg
tags: [nuxt, pro-tip, error-handling]
draft: false
---

در ۷۲ ساعت گذشته چیزی آن‌قدر مهم منتشر نشد که پایهٔ یک پست شود. تازه‌ترین مواردی که پیدا کردم پیش‌انتشار Vue 3.6.0-rc.12 و canaryهای Next.js 16.5 بودند. یادداشت‌های Vue به یک changelog ارجاع می‌دهند و تغییرات را شرح نمی‌دهند، و canaryها پایدار نیستند. Vite 8.3.5 هم در پستی قبلی پوشش داده شده است. پس امروز یک نکتهٔ حرفه‌ای Nuxt داریم. نکتهٔ قبلی دربارهٔ Next.js بود، پس نوبت Nuxt است. موضوع، دامنهٔ خطاست؛ چیزی که اشتباه گرفتنش آسان است.

همهٔ مطالب زیر با [راهنمای مدیریت خطا در Nuxt](https://nuxt.com/docs/4.x/getting-started/error-handling) و [مرجع `<NuxtErrorBoundary>`](https://nuxt.com/docs/4.x/api/components/nuxt-error-boundary) تطبیق داده شده است.

## اشتباه رایج

یک صفحه یک قابلیت اصلی دارد و چند ویجت فرعی: ریلِ پیشنهادها، پنل نظرات، یک نمودار شخص ثالث. یک ویجت `showError()` را صدا می‌زند، یا خطایی بی‌دست‌انداز در setup آن به بالای اپ می‌رسد. در هر دو حالت بازدیدکننده کل صفحه را به `error.vue` می‌بازد و مقاله‌ای که برایش آمده بود به‌خاطر خرابیِ یک سایدبار ناپدید می‌شود.

`error.vue` ابزار درست برای شکستِ سطح صفحه است. جایگزینی تمام‌صفحه است که کنار `app.vue` قرار می‌گیرد، خطا را به‌صورت prop می‌گیرد و با `clearError({ redirect: '/' })` از آن خارج می‌شوید. اما وقتی خرابی محلی است، ابزار نادرستی است.

```vue
<!-- pages/article/[slug].vue — the problematic shape -->
<script setup lang="ts">
const route = useRoute();
const { data: article } = await useFetch(`/api/articles/${route.params.slug}`);
if (!article.value) {
    throw createError({ status: 404, statusText: "Page Not Found" });
}
</script>

<template>
    <ArticleBody :article="article" />
    <!-- If this throws while rendering on the client, there is no local fallback. -->
    <RelatedRail :slug="route.params.slug" />
</template>
```

آن ۴۰۴ درست است؛ بدون مقاله، صفحه‌ای وجود ندارد. مشکل ریل است، چون چیزی خرابی‌اش را محدود نمی‌کند.

## الگوی بهتر

بخش‌های اختیاری را در `<NuxtErrorBoundary>` بپیچید. طبق مستندات، این کامپوننت خطاهای سمت کلاینت را که در اسلات پیش‌فرضش رخ می‌دهند مدیریت می‌کند. جلوی بالا رفتن (bubble) خطا را می‌گیرد و به‌جای آن اسلات `#error` را رندر می‌کند. این اسلات `error` و `clearError` را دریافت می‌کند.

```vue
<template>
    <ArticleBody :article="article" />

    <NuxtErrorBoundary @error="reportWidgetError">
        <RelatedRail :slug="route.params.slug" />

        <template #error="{ error, clearError }">
            <aside role="status">
                <p>Related articles are unavailable right now.</p>
                <button type="button" @click="clearError">Try again</button>
            </aside>
        </template>
    </NuxtErrorBoundary>
</template>
```

رویداد `@error` وقتی اسلات پیش‌فرض خطا پرتاب کند فعال می‌شود و جای خوبی برای لاگ‌کردن است. اگر وضعیت خطا را در اسکریپت لازم دارید، به کامپوننت یک template ref بدهید و `errorBoundary.value?.error` را بخوانید یا `errorBoundary.value?.clearError()` را صدا بزنید. صفحهٔ مرجع یادآوری می‌کند که این کامپوننت بر پایهٔ هوک `onErrorCaptured` در Vue ساخته شده است.

## بدانید «پاک کردن» یعنی چه

راهنما در این مورد دقیق است: برابر `null` کردن `error` اسلات پیش‌فرض را دوباره رندر می‌کند، اما باید علت اصلی را قبلاً برطرف کرده باشید، وگرنه اسلات خطا دوباره رندر می‌شود. پس دکمهٔ «تلاش دوباره» که فقط `clearError` را صدا می‌زند وقتی کار می‌کند که علت موقتی باشد یا تلاش مجدد چیزی را تغییر دهد، مثلاً دادهٔ مورد نیاز ویجت را دوباره بگیرد. اگر ویجت در هر رندر به همان شکل خطا بدهد، کار مفیدی نمی‌کند.

```vue
<template #error="{ clearError }">
    <!-- Only useful if your retry first fixes the cause, e.g. re-requests the widget's data. -->
    <button type="button" @click="retryWidgetData().then(clearError)">Retry</button>
</template>
```

`retryWidgetData` جایگزینی است برای هر واکشی مجددی که ویجت شما نیاز دارد.

رفتن به مسیر دیگر خطا را خودکار پاک می‌کند، پس مرز خطا در میان صفحه‌ها در حالت جایگزین گیر نمی‌کند.

## هر ابزار کجا به کار می‌آید

| وضعیت | ابزار |
| --- | --- |
| صفحه نمی‌تواند وجود داشته باشد (رکورد ناموجود، نبود دسترسی) | `throw createError({ status, statusText })` در صفحه، که `error.vue` رندرش می‌کند |
| یک زیردرخت غیرحیاتی می‌تواند در کلاینت مستقل خراب شود | `<NuxtErrorBoundary>` |
| می‌خواهید همه‌چیز را گزارش کنید، چه مدیریت‌شده چه نه | هوک `vue:error` یا `vueApp.config.errorHandler` در یک پلاگین |
| می‌خواهید بدانید صفحهٔ خطا نمایش داده می‌شود یا نه | `useError()` در میدلور |
| اپ راه‌اندازی نشد (پلاگین‌ها، `app:created`، رندر SSR) | هوک `app:error` |

`createError` در دو سمت رفتار متفاوتی دارد. روی سرور، خطای پرتاب‌شده صفحهٔ خطای تمام‌صفحه را نشان می‌دهد. روی کلاینت غیرمهلک است، مگر `fatal: true` بدهید. به همین دلیل ۴۰۴ سطح صفحه در مثال بالا به مسیر رندر سمت سرور تعلق دارد، نه به یک ویجت.

برای گزارش‌دهی، راهنما پلاگینی را نشان می‌دهد که به `vue:error` وصل می‌شود؛ آن را مبتنی بر `onErrorCaptured` توصیف می‌کند که وقتی خطاها به سطح بالا می‌رسند فعال می‌شود. همچنین `vueApp.config.errorHandler` را نشان می‌دهد که همهٔ خطاهای Vue را، از جمله مدیریت‌شده‌ها، دریافت می‌کند و برای سرویس گزارش خطا مناسب‌تر است.

```ts
// plugins/error-reporting.ts
export default defineNuxtPlugin((nuxtApp) => {
    nuxtApp.vueApp.config.errorHandler = (err, instance, info) => {
        // send to your reporting service
    };
    nuxtApp.hook("vue:error", (err) => {
        // errors that bubbled to the top level
    });
});
```

یکی را منبع حقیقت قرار دهید تا دوبار نشمارید. این دو هم‌پوشانی دارند و راهنما `errorHandler` را همان می‌داند که خطاهای مدیریت‌شده را هم می‌بیند.

## مصالحه‌ها و هشدارها

- **این مرز خطای سمت کلاینت است.** مستندات آن را مدیریت‌کنندهٔ خطاهای سمت کلاینت توصیف می‌کنند. رفتار SSR این کامپوننت مستند نشده و من هم راستی‌آزمایی نکرده‌ام؛ پس برای جذب شکست رندر سرور به آن تکیه نکنید. خطاهای سمت سرور را به `createError` و `error.vue` بسپارید و پیش از اتکا به مرز خطا در آن مسیر، SSR را خودتان آزمایش کنید.
- **مرز خطا خرابی را از بازدیدکننده پنهان می‌کند، نه از شما.** `@error` یا یک handler سراسری را وصل کنید. جایگزینِ بی‌صدایی که کسی لاگش نمی‌کند باگی است که تا ابد می‌ماند.
- **همه‌چیز را نپیچید.** اگر هر کامپوننت مرز خطای خودش را داشته باشد، یک صفحهٔ واقعاً خراب به شبکه‌ای از عذرخواهی تبدیل می‌شود. مرز خطا برای بخش‌های مستقل و اختیاری است. محتوای اصلی باید همچنان بلند شکست بخورد.
- **جایگزین‌ها طراحی لازم دارند.** برای آن فضا رزرو کنید تا خرابی چیدمان را جابه‌جا نکند، و مثل مثال بالا نقش دسترس‌پذیر بدهید.
- **شکاف‌های مستندات.** صفحهٔ مرجع هیچ prop یا هشداری فهرست نکرده است؛ پس هرچه فراتر از رویدادها، اسلات و دسترسی با template ref در بالا باشد، پیش از تکیه باید از سورس کامپوننت خوانده شود.

## چه وقت الگوی اولیه درست است

برای صفحهٔ تک‌منظوره، مثل مرحلهٔ پرداخت یا فرم ورود، که خرابیِ یک بخش یعنی صفحه ارزشی ندارد، `error.vue` تمام‌صفحه نتیجهٔ صادقانه است. مرز خطا فقط صفحه‌ای ناقص را نشان می‌دهد که کار نمی‌کند. زمانی از مرز خطا استفاده کنید که بقیهٔ صفحه به‌تنهایی ارزش داشته باشد.

## منابع

- [Nuxt docs: Error handling](https://nuxt.com/docs/4.x/getting-started/error-handling)
- [Nuxt docs: `<NuxtErrorBoundary>`](https://nuxt.com/docs/4.x/api/components/nuxt-error-boundary)
- [Vue core releases](https://github.com/vuejs/core/releases)
- [Next.js releases](https://github.com/vercel/next.js/releases)
- [Vite releases](https://github.com/vitejs/vite/releases)
