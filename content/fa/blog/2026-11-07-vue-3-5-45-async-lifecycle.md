---
title: "Vue 3.5.45: ۳۱ رفع باگ که بیشترشان درباره کامپوننت‌هایی است که وسط بارگذاری از بین می‌روند"
description: "Vue 3.5.45 (۵ نوامبر) مشکلات Suspense، KeepAlive، async setup و onScopeDispose را رفع می‌کند. تغییر رفتار unmount وسط await و آنچه پیش از ارتقا باید تست کنید."
date: 2026-11-07
cover: /images/blog/2026-11-07-vue-3-5-45-async-lifecycle.svg
tags: [vue, reactivity]
draft: false
---

Vue 3.5.45 در [۵ نوامبر منتشر شد](https://github.com/vuejs/core/releases) و به‌عنوان آخرین نسخه پایدار علامت خورده است. [changelog](https://raw.githubusercontent.com/vuejs/core/main/CHANGELOG.md) فهرست ۳۱ رفع باگ و چهار مورد بهبود کارایی را دارد. صفحه release متن توضیحی ندارد، پس تنها توصیف رسمی همان changelog است. بیشتر رفع‌ها یک موضوع مشترک دارند: وقتی کامپوننتی در حالی که کار async آن هنوز در جریان است unmount، جایگزین یا reject می‌شود چه اتفاقی می‌افتد. این یک الگوست که ارزش فهمیدن دارد، نه فهرستی از وصله‌های بی‌ربط.

این ادامه [3.5.44](/fa/blog/2026-10-15-vue-3-5-44-reactivity-fixes) است که آن هم یک دسته رفع Suspense داشت. خط 3.6 هنوز در حالت release candidate است (rc.14 در ۳۰ اکتبر)، پس رفع‌های مخصوص محیط production همچنان روی 3.5 می‌آیند.

## رفع اصلی: `onScopeDispose` در scope متوقف‌شده

مهم‌ترین مورد `reactivity: onScopeDispose runs in a stopped scope` است ([#16108](https://github.com/vuejs/core/pull/16108)). PR مشکل را این‌طور شرح می‌دهد: یک کامپوننت `<script setup>` با `await` سطح بالا زیر `<Suspense>` در حالی unmount می‌شود که promise هنوز pending است. در همان لحظه effect scope آن متوقف می‌شود. وقتی await حل شود، `withAsyncContext` همان scope متوقف‌شده را دوباره به‌عنوان scope فعال برمی‌گرداند. هر فراخوانی `onScopeDispose` بعد از آن، callback خود را در فهرست cleanupی می‌گذاشت که قبلاً خالی شده بود، پس هیچ‌وقت اجرا نمی‌شد.

نتیجه عملی نشت منبع است. composableی که listener ثبت می‌کند و برای حذف آن به `onScopeDispose` تکیه دارد، listener را یک بار وصل می‌کرد و هرگز جدا نمی‌کرد:

```vue
<script setup lang="ts">
// Navigate away while this await is pending.
const config = await fetchConfig();

// Before 3.5.45 the cleanup was queued into a dead scope.
// useEventListener registers its removal through onScopeDispose.
useEventListener(window, "resize", onResize);
</script>
```

بعد از رفع، `onScopeDispose` بررسی می‌کند scope فعال هنوز active است یا نه، و اگر متوقف شده باشد callback را بلافاصله اجرا می‌کند. listener در همان tick هم وصل و هم جدا می‌شود، نه اینکه برای همیشه بماند. طبق PR این رفتار با guard موجود در constructorهای `ReactiveEffect` و `EffectScope` از [#14778](https://github.com/vuejs/core/pull/14778) هم‌خوان است، و وقتی scope فعالی نباشد یا scope هنوز در حال اجرا باشد رفتار تغییری نکرده است.

دو نکته. اول، مدخل changelog به‌صورت یک تغییر عمومی `onScopeDispose` نوشته شده نه تغییر مخصوص Suspense، پس همین قاعده برای هر کدی که دوباره وارد یک scope متوقف‌شده شود صدق می‌کند. دوم، callback اکنون هم‌زمان با ثبت اجرا می‌شود، پس کد cleanupی که فرض می‌کند فقط در زمان teardown اجرا می‌شود باید تحمل اجرای زودهنگام را داشته باشد.

## async setup رد‌شده اکنون چیزی رندر نمی‌کند

`runtime-core: a component whose async setup rejects renders nothing` ([#16111](https://github.com/vuejs/core/pull/16111)). طبق خلاصه PR، کامپوننتی که `setup` ناهمگام آن خطا بدهد اکنون یک placeholder خالی رندر می‌کند (در تست‌ها یک comment node). دیگر به template خود برنمی‌گردد و خطاهای رندر اضافی تولید نمی‌کند. در SSR و hydration کامپوننت ناموفق نشانه‌گذاری placeholder مورد انتظار را نگه می‌دارد و error handler خطای setup را فقط یک بار دریافت می‌کند.

مدخل مرتبط دیگری می‌گوید وقتی async setup بدون error handler در dev reject شود boundary حل می‌شود ([#16110](https://github.com/vuejs/core/pull/16110))، پس فرزند خراب نباید در توسعه یک Suspense را pending باقی بگذارد.

در برنامه‌های Nuxt این وقتی بیشترین اهمیت را دارد که مدیریت خطا برقرار باشد. اگر ویجت‌ها را در `NuxtErrorBoundary` می‌پیچید یا `app.config.errorHandler` تنظیم کرده‌اید، انتظار یک خطای تمیز و یک slot خالی را داشته باشید، نه زنجیره‌ای از خطاها. اگر به رندر جایگزین قبلی تکیه کرده بودید، یک UI خطای صریح اضافه کنید.

## Suspense: دنباله‌ای بلند از «unmount در حالت pending»

از ۳۱ رفع، ۱۳ مورد scope `suspense` دارند و بیشترشان حالتی را توصیف می‌کنند که نباید زنده می‌ماند. گروه‌بندی بر اساس آنچه محافظت می‌شود:

- **unmount در حالت pending:** fallback بعد از unmount شدن boundary mount نمی‌شود ([#15939](https://github.com/vuejs/core/pull/15939))، hookهای unmount شاخه pending حذف می‌شوند، placeholder یک async component در حالت pending که unmount شده پاک می‌شود ([#15982](https://github.com/vuejs/core/pull/15982))، و وابستگی والد در unmount suspensible آزاد می‌شود ([#15870](https://github.com/vuejs/core/pull/15870)).
- **شاخه‌های دورانداخته‌شده:** کامپوننت دورانداخته‌شده به‌عنوان unmount‌شده علامت می‌ماند، cleanup داخلی آن حفظ می‌شود، وابستگی‌های async چرخه pending دورانداخته‌شده حل می‌شوند ([#15980](https://github.com/vuejs/core/pull/15980))، و تلاش مجدد به‌روزرسانی root از یک شاخه دورانداخته‌شده جان سالم به در می‌برد ([#16107](https://github.com/vuejs/core/pull/16107)).
- **زمان‌بندی:** وقتی root در حال pending دوباره عوض می‌شود timeout به شمارش ادامه می‌دهد ([#16143](https://github.com/vuejs/core/pull/16143)).
- **boundaryهای تودرتو:** به‌روزرسانی‌های هم‌root در محتوای نگه‌داشته‌شده patch می‌شوند ([#16109](https://github.com/vuejs/core/pull/16109))، و جایگزینی root در یک boundary تودرتوی نگه‌داشته‌شده که fallback نشان می‌دهد رد می‌شود ([#16125](https://github.com/vuejs/core/pull/16125)).
- **transitionها:** transitionهای تودرتو در شاخه pending هنگام آشکار شدن وارد می‌شوند ([#16121](https://github.com/vuejs/core/pull/16121))، حالت‌ها دور یک suspense boundary کلیددار تعویض می‌شوند ([#16124](https://github.com/vuejs/core/pull/16124))، `afterLeave` حالت out-in برای boundary unmount‌شده رد می‌شود ([#16115](https://github.com/vuejs/core/pull/16115))، و leave که فوراً تمام می‌شود در حالت out-in مدیریت می‌شود ([#11824](https://github.com/vuejs/core/pull/11824)).

changelog فقط عنوان می‌دهد، پس نمی‌توانم بگویم در یک برنامه عادی با چند مورد از این‌ها روبه‌رو می‌شوید. این موارد حول ناوبری سریع، boundaryهای async تودرتو و transitionهای out-in روی صفحه‌های async جمع شده‌اند، یعنی ترکیب transition صفحه در Nuxt با async setup.

## KeepAlive، hydration و بقیه

- KeepAlive: فرزند Suspense حل‌شده فوراً کش می‌شود ([#16119](https://github.com/vuejs/core/pull/16119))، و فرزندی که پیش از کش شدن غیرفعال شده unmount می‌شود ([#15981](https://github.com/vuejs/core/pull/15981)).
- Hydration: `el` کامپوننت فقط وقتی به‌روز می‌شود که گره میزبان آن جایگزین شده باشد ([#16001](https://github.com/vuejs/core/pull/16001)).
- HMR: بارگذاری مجدد بعد از حل شدن rootهای async در حال انتظار دوباره تلاش می‌شود ([#16060](https://github.com/vuejs/core/pull/16060)).
- Runtime-core: hookهای `mounted` دایرکتیو آخرین binding را می‌گیرند ([#16120](https://github.com/vuejs/core/pull/16120))، و error boundaryهای متوقف‌شده برای خطاهای async رد می‌شوند ([#16061](https://github.com/vuejs/core/pull/16061)).
- Compiler: scopeهای `catch` و `switch` در `compiler-sfc` رعایت می‌شوند ([#16101](https://github.com/vuejs/core/pull/16101))، و bindingهای boolean ایستا در `compiler-dom` معنای خود را حفظ می‌کنند ([#16055](https://github.com/vuejs/core/pull/16055)).
- Runtime-dom: `disablepictureinpicture` و `disableremoteplayback` اتریبیوت boolean هستند ([#15952](https://github.com/vuejs/core/pull/15952)).
- `v-model`: مُعدِّل `number` برای مقادیر `Set` در select رعایت می‌شود.

## موارد کارایی

چهار مدخل با برچسب کارایی: `compiler-ssr` اتریبیوت‌های `style` ایستا را در زمان کامپایل رندر می‌کند ([#16010](https://github.com/vuejs/core/pull/16010))، `compiler-sfc` شمارش include بلااستفاده در tsconfig را رد می‌کند ([#15899](https://github.com/vuejs/core/pull/15899))، مقداردهنده‌های داخلی pure علامت می‌خورند ([#16012](https://github.com/vuejs/core/pull/16012))، و attrs خام وقتی attrs زمینه setup به‌عنوان props یک vnode داده می‌شوند کپی می‌شوند ([#16129](https://github.com/vuejs/core/pull/16129)). changelog هیچ اندازه‌گیری‌ای نمی‌دهد، پس این‌ها را جهت بدانید نه عدد. مورد SSR را با مقایسه خروجی سرور راحت‌تر می‌توانید خودتان بسنجید.

## چک‌لیست ارتقا

هیچ موردی breaking علامت نخورده، اما چند مدخل رفتار قابل مشاهده را در حالت‌های لبه تغییر می‌دهند:

1. در composableهایتان `onScopeDispose` را جست‌وجو کنید و ببینید آیا جایی فرض می‌کند هنگام ثبت هرگز اجرا نمی‌شود.
2. ناوبری از صفحه‌های دارای `await` سطح بالا را وقتی درخواست کند است تست کنید و مطمئن شوید listenerها، timerها و observerها آزاد می‌شوند.
3. اگر خطاهای async setup را مدیریت می‌کنید، UI یک فرزند ناموفق را بررسی کنید: اکنون یک placeholder خالی است نه template نیمه‌رندرشده.
4. جریان‌های transition صفحه با `mode="out-in"` و صفحه‌های async را اجرا کنید.

## مصالحه‌ها

این رفع‌ها معنای unmount را قابل‌پیش‌بینی‌تر می‌کنند، اما اجرای فوری یک cleanup همچنان تغییر رفتار است: کدی که بی‌صدا به هرگز پاک نشدن وابسته بود (listenerی که اتفاقاً از کامپوننت خود بیشتر عمر می‌کرد) اکنون بی‌سروصدا از کار می‌افتد. تور ایمنی شما تست‌های خودتان درباره زمان‌بندی unmount است، نه شماره نسخه. اگر Suspense، async setup و `KeepAlive` را با هم استفاده نمی‌کنید، بیشتر این نسخه به شما نمی‌رسد و یک ارتقای معمول کافی است.

## منابع

- [vuejs/core releases](https://github.com/vuejs/core/releases)
- [vuejs/core release v3.5.45](https://github.com/vuejs/core/releases/tag/v3.5.45)
- [vuejs/core CHANGELOG.md](https://raw.githubusercontent.com/vuejs/core/main/CHANGELOG.md)
- [vuejs/core PR #16108](https://github.com/vuejs/core/pull/16108)
- [vuejs/core PR #16111](https://github.com/vuejs/core/pull/16111)
