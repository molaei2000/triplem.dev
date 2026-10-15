---
title: "Vue 3.5.44: اصلاحات reactivity، Suspense و transition که پیش از ارتقا باید بخوانید"
description: "Vue 3.5.44 در ۱۳ اکتبر با ۲۵ اصلاح منتشر شد: ردیابی وابستگی در watcher، watcherهای once، مقادیر falsy در v-html، Suspense، Teleport و hydration. چه چیزهایی را بررسی کنید."
date: 2026-10-15
cover: /images/blog/2026-10-15-vue-3-5-44-reactivity-fixes.svg
tags: [vue, reactivity]
draft: false
---

نسخه [3.5.44](https://github.com/vuejs/core/releases) در ۱۳ اکتبر منتشر شد و به‌عنوان آخرین نسخه پایدار علامت خورده است. این نسخه پس از 3.5.43 (۱۷ سپتامبر) می‌آید و در زمانی که خط 3.6 هنوز در مرحله release candidate است، شاخه 3.5 همچنان جای اصلاحات محیط production است. [changelog](https://github.com/vuejs/core/blob/main/CHANGELOG.md) فقط اصلاح باگ دارد، ۲۵ مورد. بیشتر آن‌ها edge case هستند، اما چند مورد رفتاری را عوض می‌کنند که کد واقعی ممکن است به آن تکیه کرده باشد و پیش از به‌روزرسانی lockfile ارزش نگاه کردن دارند.

## Reactivity: سه تغییر رفتاری

این موارد را دو بار بخوانید.

**callbackهای watcher که داخل یک effect دیگر اجرا می‌شوند دیگر وابستگی ردیابی نمی‌کنند** (#15782، closes #5009). changelog فقط همین‌قدر توضیح می‌دهد. برداشت محتمل: خواندن‌ها داخل callback یک watcher که درون یک effect بیرونی اجرا می‌شود نباید توسط آن effect بیرونی ردیابی شود. کدی که ناخواسته به این ردیابی اضافه تکیه داشته ممکن است دیگر دوباره اجرا نشود، پس حالت‌های watcher تو در تو را تست کنید.

**watcher از نوع `once` وقتی callback آن خطا بدهد متوقف می‌شود** (#15755). changelog فقط عنوان یک‌خطی را می‌دهد، پس جزئیات را در PR ببینید. مفهوم آن این است که callbackی که throw کند، عمر watcher را تمام می‌کند:

```ts
import { ref, watch } from "vue";

const token = ref<string | null>(null);

watch(
    token,
    (value) => {
        if (!value) return;
        parseClaims(value); // may throw
    },
    { once: true },
);
```

اگر `once` را به‌صورت «اولین بار که truthy شد اجرا کن و در صورت شکست دوباره تلاش کن» به کار برده‌اید، پس از throw روی تلاش مجدد حساب نکنید. اگر باید ادامه دهد، داخل callback خطا را بگیرید.

**iteratorهای بومی آرایه دیگر mutate نمی‌شوند** (#15703، closes #15643) و **معنای shallow در collectionها حفظ می‌شود** (#15793، closes #15792). هر دو درباره proxyهایی هستند که reactivity تحویل می‌دهد. اگر collectionهای `shallowReactive` یا `shallowRef` دارید، تست‌های مرتبط را دوباره اجرا کنید.

## تغییرات کامپایلر و SFC

- `v-html` اکنون `0` و `false` را به‌صورت رشته رندر می‌کند (#15571). هر binding از `v-html` را که می‌تواند `0` یا `false` باشد بررسی کنید و مطمئن شوید خروجی همان است که می‌خواهید.
- guard کش `v-memo` کلید `v-for` را داخل پرانتز می‌گذارد (#15724، closes #15723). این اصلاحی در خروجی کامپایل برای کلیدهایی است که expression هستند.
- کامپایلر SFC وقتی گزینه‌های `defineModel` به یک prop destructure‌شده اشاره کنند خطا گزارش می‌کند (#15604، closes #15602). این مورد می‌تواند buildی را که قبلاً پاس می‌شد بشکند:

```vue
<script setup lang="ts">
const { min = 0 } = defineProps<{ min?: number }>();

// Now a compile error: the options reference a destructured prop.
const model = defineModel<number>({ default: min });
</script>
```

changelog فقط می‌گوید کامپایلر اکنون اینجا خطا گزارش می‌کند، پس buildی که قبلاً پاس می‌شد ممکن است شکست بخورد. از یک مقدار پیش‌فرض literal استفاده کنید یا مقدار را بعد از ساخت model محاسبه کنید.

- transition پایدار برای `v-show` در buildهای production تزریق می‌شود (#15783).

## Runtime-core: صف و props

دو اصلاح scheduler و مسیر patch را لمس می‌کنند:

- فقط jobهایی که خود رندر ریشه در صف گذاشته flush می‌شوند (#15757، closes #6728). flush اکنون به jobهای همان رندر محدود است، پس به flush شدن کارهای نامرتبط صف‌شده توسط یک رندر تکیه نکنید.
- مقایسه کامل props اکنون کلیدهای جدید prop را تشخیص می‌دهد (#15634، closes #15632). این اصلاح موردهایی را هدف می‌گیرد که در آن کلید جدید prop نادیده می‌ماند.

همچنین در فهرست: `v-for` با range نامعتبر در production چیزی رندر نمی‌کند (#15742) و placeholder ناهمگام برای block patching و به‌روزرسانی‌های در انتظار کامپوننت حفظ می‌شود (#15554، closes #15551).

## Suspense، hydration، Teleport و transitionها

بیشتر حجم این نسخه همین‌جاست، بخشی که از 3.5.42 (۲۷ اوت) اصلاحات پیوسته گرفته است:

- Suspense: کامپوننت ناهمگام resolve‌شده با namespace خودش mount می‌شود (#15640) و کامپوننت‌های ناهمگامی که در حین pending unmount شده‌اند دیگر رندر نمی‌شوند.
- Hydration: `hydrateOnVisible` اکنون فرزندان ریشه‌ای با `display: contents` را مشاهده می‌کند (#15773).
- Teleport: `targetStart` جابه‌جا می‌شود و فرزندان قبل از `targetAnchor` می‌مانند (#15818، closes #15817).
- Transitionها: ریشه‌های کامپوننت که با comment پوشیده شده‌اند پشتیبانی می‌شوند (#15853، closes #6080, #5500) و `TransitionGroup`های تو در تو نسبت به آیتم بیرونیِ در حال حرکت اندازه‌گیری می‌شوند (#15848، closes #5385, #1531).
- KeepAlive: کامپوننت جاری هرس‌شده وقتی vnode آن هنگام mount کلون شده باشد unmount می‌شود (#15711).
- Custom elementها: custom element ناهمگامی که در حین بارگذاری حذف شده دیگر mount نمی‌شود (#15777).
- SSR: خطاهای async setup از server renderer منتشر می‌شوند (#15857، closes #15716) و overrideهای falsy محتوای vnode رعایت می‌شوند (#15769).

انتشار خطا در سمت سرور مهم‌ترین مورد برای Nuxt و اپ‌های SSR است. خطاهای async `setup` اکنون از server renderer منتشر می‌شوند، پس بعد از ارتقا لاگ‌ها و صفحه‌های خطا را زیر نظر بگیرید.

موارد کوچک‌تر: `playsinline` یک attribute بولین است (#15627)، `v-show` برای style stringهای بدون تغییر مقدار display را حفظ می‌کند (#15794) و build سازگاری Vue 2.7 مقدار `_setupProxy` را در دسترس می‌گذارد (#15618).

## نحوه ارتقا

این یک patch release است، اما موارد reactivity و کامپایلر تغییر رفتاری‌اند. ترتیب پیشنهادی:

1. نسخه را بالا ببرید و اول type check و build را اجرا کنید. خطای `defineModel` همان‌جا ظاهر می‌شود، نه در runtime.
2. watcherهای `once: true` و callbackهای `watch` را که state مشترک با یک computed بیرونی می‌خوانند جست‌وجو کنید.
3. هر binding از `v-html` را که می‌تواند `0` یا `false` باشد بررسی کنید.
4. در اولین deploy لاگ‌های سرور را برای خطاهای async setup که تازه ظاهر شده‌اند ببینید.

## Trade-offها

patch releaseهایی که معنا را سخت‌گیرانه‌تر می‌کنند تصمیم درستی‌اند، اما رایگان نیستند. اصلاحی مثل ردیابی watcher، coupling تصادفی را حذف می‌کند و کدی که به آن وابسته بود بدون خطا می‌شکند. هیچ موردی در changelog به‌عنوان breaking علامت نخورده، پس شبکه ایمنی شما تست‌های خودتان است، نه شماره نسخه. اگر مجموعه تست شما برای watcherهای تو در توی computed یا render effect پوشش ندارد، پیش از ارتقا یک تست بنویسید، نه بعد از آن.

هیچ‌یک از این‌ها روایت 3.6 را تغییر نمی‌دهد. [release candidateهای 3.6](/fa/blog/2026-10-11-vue-3-6-rc-11-vapor-warnings) همچنان جای کار روی Vapor هستند؛ 3.5.44 برای اپ‌هایی است که روی رندرر پایدار می‌مانند.

## منابع

- [vuejs/core releases](https://github.com/vuejs/core/releases)
- [vuejs/core CHANGELOG.md](https://github.com/vuejs/core/blob/main/CHANGELOG.md)
