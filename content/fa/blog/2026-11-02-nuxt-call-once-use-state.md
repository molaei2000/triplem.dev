---
title: "نکتهٔ حرفه‌ای Nuxt: وضعیت مشترک را با useState و callOnce مقداردهی کنید، نه با ref در سطح ماژول یا onMounted"
description: "ref در سطح ماژول بین درخواست‌های SSR نشت می‌کند و واکشی در onMounted یا دوبار اجرا می‌شود یا دیر. با useState و callOnce وضعیت مشترک را یک‌بار مقداردهی کنید."
date: 2026-11-02
cover: /images/blog/2026-11-02-nuxt-call-once-use-state.svg
tags: [nuxt, pro-tip, state-management]
draft: false
---

در ۷۲ ساعت گذشته چیز مهم و پایداری منتشر نشد. تنها انتشارهای تازه پیش‌انتشار بودند: [Vue 3.6.0-rc.14 در ۳۰ اکتبر](https://github.com/vuejs/core/releases)، و آخرین نسخهٔ Nuxt همچنان [4.6.3 مورخ ۲۷ اکتبر](https://github.com/nuxt/nuxt/releases) است که قبلاً پوشش داده‌ایم. این وبلاگ دربارهٔ release candidateها نمی‌نویسد و نکتهٔ حرفه‌ایِ قبلی دربارهٔ Next.js بود، پس امروز نکته‌ای از Nuxt می‌آید دربارهٔ جایی که اپ‌های SSR بی‌صدا خراب می‌شوند: وضعیت مشترک کجا ساخته می‌شود و چه کسی آن را مقداردهی می‌کند.

همهٔ مطالب زیر با [مرجع `useState`](https://nuxt.com/docs/4.x/api/composables/use-state)، [مرجع `callOnce`](https://nuxt.com/docs/4.x/api/utils/call-once) و [راهنمای مدیریت state](https://nuxt.com/docs/4.x/getting-started/state-management) در Nuxt 4.x تطبیق داده شده است.

## اشتباه‌های رایج

دو الگو تقریباً در هر کدبیسی که از یک SPA فقط‌کلاینت رشد کرده دیده می‌شود.

**اشتباه اول: state در سطح ماژول.**

```ts
// composables/session.ts
export const session = ref<{ user: string | null }>({ user: null });
```

در کلاینت این مثل یک singleton رفتار می‌کند، که همان چیزی است که مردم می‌خواهند. در سرور، ماژول یک‌بار به‌ازای هر پردازش ارزیابی می‌شود، پس همهٔ درخواست‌ها همان `ref` را import می‌کنند. راهنمای state صریح است: `ref` را بیرون از `<script setup>` یا `setup()` تعریف نکنید، چون بین درخواست‌ها مشترک می‌شود و می‌تواند داده را بین کاربران نشت دهد و باعث نشت حافظه شود. این مقدار برای hydration هم نامرئی است، چون چیزی آن را در پیلود نمی‌گذارد. کلاینت صرف‌نظر از آنچه سرور رندر کرد، از `ref` خالی خودش شروع می‌کند.

**اشتباه دوم: مقداردهی داده‌ٔ مشترک در `onMounted` یا یک `await` سطح‌بالای ساده.**

```vue
<script setup lang="ts">
const config = useState<SiteConfig | null>("config", () => null);

onMounted(async () => {
    config.value = await $fetch("/api/config");
});
</script>
```

`onMounted` هرگز روی سرور اجرا نمی‌شود، پس HTML سرور وضعیت خالی را رندر می‌کند و کلاینت بعداً آن را پر می‌کند: محتوا چشمک می‌زند و چیدمان جابه‌جا می‌شود. راه‌حلِ برعکس، یعنی یک `await $fetch` ساده در setup، روی سرور اجرا می‌شود و دوباره هنگام hydration روی کلاینت اجرا می‌شود؛ یعنی دوبار هزینهٔ درخواست را می‌دهید و اگر دو پاسخ فرق کنند، خطر mismatch دارید.

## راه‌حل: یک composable کلیددار به‌علاوهٔ `callOnce`

state را در یک composable دور `useState` بپیچید و با `callOnce` مقداردهی کنید.

```ts
// composables/useSiteConfig.ts
export const useSiteConfig = () => useState<SiteConfig | null>("site-config", () => null);
```

```vue
<!-- app.vue -->
<script setup lang="ts">
const config = useSiteConfig();

await callOnce("site-config", async () => {
    config.value = await $fetch("/api/config");
});
</script>
```

این همان شکلی است که راهنمای رسمی برای پر کردن state در `app.vue` پیش از رندر به کار می‌برد. نقش هر بخش:

- `useState(key, init)` یک `Ref<T>` برمی‌گرداند که دادهٔ آن به JSON سریالایز می‌شود و از hydration عبور می‌کند. کلید داده را یکتا می‌کند، پس هر کامپوننتی که `useSiteConfig()` را صدا بزند همان ref را می‌گیرد. تابع `init` فقط وقتی اجرا می‌شود که state هنوز مقداردهی نشده باشد.
- `callOnce` تابع را در SSR اجرا می‌کند و چون این را در پیلود Nuxt ثبت می‌کند، هنگام hydration دوباره اجرایش نمی‌کند. در حالت پیش‌فرض `render`، بازگشت به صفحه در کلاینت هم آن را دوباره اجرا نمی‌کند.
- کلید `"site-config"` صریح است. اگر حذفش کنید Nuxt از فایل و خطِ فراخوانی یکی می‌سازد. کار می‌کند، اما کلیدی که خودتان انتخاب کرده‌اید از refactor جان سالم به‌در می‌برد و در پیلود به شکلی ظاهر می‌شود که می‌توانید دربارهٔ آن استدلال کنید.

نتیجه: یک درخواست روی سرور، بدون تکرار روی کلاینت، و HTML سروری که از قبل داده را دارد.

## `mode: "navigation"` برای اثرهای جانبیِ هر ناوبری

حالت پیش‌فرض `render` دربارهٔ رندر اولیه است. اگر می‌خواهید تابعی یک‌بار در بارگذاری اول و دوباره در هر ناوبریِ سمت کلاینت اجرا شود، و باز هم تکرار هنگام SSR و hydration را رد کند، `mode` بدهید:

```vue
<script setup lang="ts">
await callOnce(
    "track-visit",
    () => {
        console.log("first load, then every client-side navigation");
    },
    { mode: "navigation" },
);
</script>
```

مستندات حالت `navigation` را از Nuxt 3.15 به بعد معرفی می‌کنند، پس روی هر اپ Nuxt 4 فعلی امن است. کاربردهای معمول، ثبت بازدید صفحه در آنالیتیکس و تازه‌کردن بخش کوچکی از state مشترک هنگام تغییر مسیر است. این جایگزین اعلانیِ یک watcher روی `route.path` است که مجبور است اجرای اول را جداگانه مدیریت کند.

## storeهای Pinia همین ایده را دنبال می‌کنند

اگر state مشترک شما در یک store پینیا است، راهنما همین الگو را پیشنهاد می‌کند: اکشنِ بارگذاری store را از طریق `callOnce` صدا بزنید، مثلاً `await callOnce(website.fetch)`. اکشن روی سرور اجرا می‌شود، state استور به کلاینت منتقل می‌شود و hydration واکشی را تکرار نمی‌کند.

## مصالحه‌ها و هشدارها

- **`callOnce` مقدار `Promise<void>` برمی‌گرداند.** نتیجهٔ تابع شما را پس نمی‌دهد، پس ابزار واکشی داده نیست. برای دادهٔ متعلق به یک صفحه از `useAsyncData` یا `useFetch` استفاده کنید که status، خطا، refresh و کش مبتنی بر کلید می‌دهند. وقتی داده سراسری است، یک‌بار نوشته می‌شود و از جاهای زیادی خوانده می‌شود، سراغ `callOnce` به‌علاوهٔ `useState` بروید.
- **مستقیماً در setup، پلاگین یا route middleware صدایش بزنید.** سازوکار پیلود به این وابسته است. صدا زدنش از یک helper دلخواه بیرون از این زمینه‌ها، یا بعد از مرز `await` نامرتبطی که خودتان ساخته‌اید، هدف را از بین می‌برد.
- **state باید قابل سریالایز به JSON باشد.** `useState` به JSON سریالایز می‌کند، پس از کلاس، تابع و symbol دوری کنید. ذخیرهٔ یک نمونهٔ کلاس می‌تواند خطای "Cannot stringify arbitrary non-POJOs" بدهد؛ مستندات اگر واقعاً لازم باشد سریالایزر سفارشی از طریق `definePayloadPlugin` را نشان می‌دهند، اما معمولاً یک شیء ساده پاسخ بهتری است.
- **پیلود را کوچک نگه دارید.** هرچه در `useState` بگذارید در HTML ارسال می‌شود. برای اشیای بزرگی که به reactivity عمیق نیاز ندارید، مستندات پیچیدن مقدار اولیه در `shallowRef` را نشان می‌دهند که می‌تواند برای اشیا و آرایه‌های بزرگ به کارایی کمک کند.
- **تابع خودتان را `useState` نام‌گذاری نکنید.** کامپایلر این شناسه را تبدیل می‌کند و صفحهٔ مرجع این نام را رزرو کرده است.
- **کلیدها سراسری‌اند.** دو قابلیت نامرتبط که از `"config"` استفاده کنند state را به اشتراک می‌گذارند. برایشان فضای نام بگذارید (`"site-config"`، `"checkout-config"`) و هرکدام را پشت composable خودش بگذارید تا کلید فقط در یک فایل باشد.
- **ابطال یک دغدغهٔ جداست.** راهنما `clearNuxtState` را ابزار ابطال سراسری stateِ کش‌شده معرفی می‌کند. مستندات تعامل آن با `callOnce` را شرح نمی‌دهند، پس این ترکیب را خودتان آزمایش کنید و از اول معلوم کنید چه کسی مسئول مقداردهی دوبارهٔ state است.

## جایی که الگوی اول هنوز درست است

ثابت سطح ماژول وقتی کاملاً تغییرناپذیر و مستقل از درخواست باشد کاملاً امن است: یک جدول جست‌وجوی freeze‌شده، یک عبارت منظم کامپایل‌شده، فهرست نام مسیرها. مشکل داده‌ٔ تغییرپذیر و وابسته به کاربر یا درخواست است. همین‌طور `onMounted` جای درست کارهای فقط‌کلاینت است، مثل اندازه‌گیری DOM، راه‌اندازی `ResizeObserver` یا خواندن `localStorage`، چون این کارها اصلاً روی سرور اجرا نمی‌شوند. چیزی که نباید باشد، اولین و تنها جایی است که داده‌ٔ مشترکِ مؤثر در رندر بارگذاری می‌شود.

یک قاعدهٔ مرور سریع که بیشترشان را می‌گیرد: در composableهایتان دنبال `ref(`، `reactive(` و `new Map(` سطح‌بالا بگردید و دربارهٔ هرکدام بپرسید آیا می‌تواند چیزی نگه دارد که بین دو بازدیدکننده فرق دارد. اگر بله، آن را پشت `useState` ببرید و مقداردهی یک‌باره را به `callOnce` بسپارید.

## منابع

- [Nuxt releases on GitHub](https://github.com/nuxt/nuxt/releases)
- [Vue core releases on GitHub](https://github.com/vuejs/core/releases)
- [Vite releases on GitHub](https://github.com/vitejs/vite/releases)
- [Nuxt docs: callOnce](https://nuxt.com/docs/4.x/api/utils/call-once)
- [Nuxt docs: useState](https://nuxt.com/docs/4.x/api/composables/use-state)
- [Nuxt docs: State management](https://nuxt.com/docs/4.x/getting-started/state-management)
