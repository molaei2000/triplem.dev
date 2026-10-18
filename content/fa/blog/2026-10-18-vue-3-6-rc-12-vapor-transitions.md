---
title: "Vue 3.6.0-rc.12: مرور دوباره حالت‌های مرزی Transition و KeepAlive در Vapor"
description: "Vue 3.6.0-rc.12 در ۱۶ اکتبر با اصلاح cleanup واچرها، ده‌ها رفع‌اشکال Transition و KeepAlive در Vapor و باندل hydration سبک‌تر منتشر شد. چه چیزی را تست کنیم."
date: 2026-10-18
cover: /images/blog/2026-10-18-vue-3-6-rc-12-vapor-transitions.svg
tags: [vue, vapor, reactivity]
draft: false
---

نسخه Vue 3.6.0-rc.12 در ۱۶ اکتبر، شش روز پس از [rc.11](/fa/blog/2026-10-11-vue-3-6-rc-11-vapor-warnings)، تگ شد. [صفحه releases](https://github.com/vuejs/core/releases) همچنان 3.5.44 (۱۳ اکتبر) را آخرین نسخه پایدار و rc.12 را پیش‌انتشار نشان می‌دهد. [changelog نسخه 3.6](https://raw.githubusercontent.com/vuejs/core/minor/CHANGELOG.md) این بار هیچ قابلیتی ندارد؛ یک رفع‌اشکال reactivity، تعداد زیادی اصلاح در `runtime-vapor` و `vapor` و یک مورد بهبود کارایی دارد. تم از عنوان‌ها روشن است: زیردرخت‌های انیمیت‌شده و کش‌شده، یعنی جاهایی که رندرری بدون virtual DOM باید ترتیبی را بازسازی کند که vdom مجانی داشت.

## تنها اصلاح reactivity: cleanup واچرها

زیر `reactivity` تنها مورد این است: «cleanup واچرها تا اجرای دوباره callback حفظ شود» (#15766، بستن #15765). changelog توضیح بیشتری نمی‌دهد، پس نمی‌توانم بگویم خطای دقیق چه بود. عنوان قرارداد را نشان می‌دهد: cleanupی که در callback واچر ثبت شده باید تا اجرای بعدی همان callback زنده بماند، نه زودتر حذف شود.

این همان رفتاری است که بیشتر کدها فرض می‌کنند:

```ts
import { watch, onWatcherCleanup, ref } from "vue";

const query = ref("");

watch(query, (q) => {
    const controller = new AbortController();
    onWatcherCleanup(() => controller.abort());
    fetch(`/api/search?q=${encodeURIComponent(q)}`, { signal: controller.signal });
});
```

بررسی نکردم که این اصلاح به شاخه 3.5 هم بک‌پورت شده یا نه، و یادداشت‌های 3.5.44 که دارم فقط اشاره‌ای به changelog است. اگر به زمان‌بندی cleanup برای abort یا اشتراک‌ها تکیه دارید، تستی بنویسید که ترتیب را بسنجد و روی هر دو نسخه اجرایش کنید.

## Transition و KeepAlive: جایی که بیشتر این نسخه صرف شده

هشت مورد از سیزده اصلاح `runtime-vapor` به `Transition`، `TransitionGroup` یا `KeepAlive` مربوط است:

- گروه‌های transition تودرتو اکنون حرکت اجداد را در نظر می‌گیرند (#15865).
- حذف fragment در interop تا پایان leave صبر می‌کند (#15866).
- leave مربوط به غیرفعال‌سازی وقتی المان بعد از جابه‌جایی `KeepAlive` قرار دارد کامل می‌شود (#15846).
- شاخه به‌تعویق‌افتاده `out-in` وقتی fragment پس از جابه‌جایی `KeepAlive` است رندر می‌شود (#15844).
- fallback اسلات وقتی محتوایش زیر `out-in` خالی است بلافاصله resolve می‌شود (#15890).
- leave از نوع `in-out` که هیچ المان ورودی آن را برنمی‌دارد همچنان اجرا می‌شود (#15849).
- `in-out` leave یک شاخه kept-alive بعد از enter ورودی شروع می‌شود (#15895).
- تعویض شاخه slot outlet زیر `Transition` ساختاری حساب می‌شود (#15897).

این‌ها شبیه خروجی کسی است که حالت‌ها را ترکیبی اجرا کرده: `out-in` و `in-out` در کنار `KeepAlive`، fallback اسلات‌ها و fragmentهای interop. کامپوننتی که چند مورد را همزمان لمس می‌کند چنین است:

```vue
<script setup vapor lang="ts">
import { shallowRef } from "vue";
import Overview from "./Overview.vue";
import Billing from "./Billing.vue";

const tab = shallowRef(Overview);
</script>

<template>
    <button @click="tab = tab === Overview ? Billing : Overview">Switch</button>
    <Transition name="fade" mode="out-in">
        <KeepAlive>
            <component :is="tab" />
        </KeepAlive>
    </Transition>
</template>
```

پنل تب با transition دور نمای کش‌شده رابط کاملاً معمولی است، و اینکه چند اصلاح همین ترکیب را هدف گرفته‌اند نشان می‌دهد rc.11 و پیش از آن در این حالت امن نبودند. هیچ‌یک از این باگ‌ها را بازتولید نکردم؛ برداشتم فقط از عنوان‌های changelog است.

## اصلاحات کوچک‌تر Vapor که ارزش مرور دارند

- **props و اسلات‌ها:** `hasOwnProperty` اکنون روی props، attrs و slot props کار می‌کند (#15841، بستن #15840). هر کدی که `Object.hasOwn(props, "x")` یا `props.hasOwnProperty("x")` به کار می‌برد سود می‌برد.
- **Unmount:** یک block node از `parentNode` واقعی‌اش حذف می‌شود (#15867، بستن #15861).
- **فهرست‌ها:** بازه نامعتبر `v-for` در production چیزی رندر نمی‌کند (#15863).
- **هشدارها:** context هشدار هنگام به‌روزرسانی render effect push می‌شود (#15874). اثر عملی، component stack بهتر در هشدارهای dev است که با کار هشدارهای rc.11 جور است.
- **کامپایلر (`vapor`):** مقادیر پیش‌فرض destructure در سطح خودشان اعمال می‌شوند (#15860)، هویت keyed slot outlet حفظ می‌شود (d7c0ab5) و حالت inline برای `render` در script معمولی bindingها را برمی‌گرداند (#15780).
- **SSR:** فرزندان یک المان native پویا مثل المان ایستا رندر می‌شوند (#15852، بستن #15845).
- **Interop:** vnode اسلات Vapor داخل outlet در vdom روی node مستقل خودش شروع می‌شود (#15850).

اصلاح مقادیر پیش‌فرض destructure همان است که می‌تواند بی‌صدا مقدارها را عوض کند: اگر در کامپوننت Vapor در چند سطح props را با مقدار پیش‌فرض destructure می‌کنید، خروجی رندر را پیش و پس از ارتقا مقایسه کنید.

## مورد بهبود کارایی

`runtime-vapor` اکنون lookupهای hydration مربوط به helperهای DOM node را در باندل‌های کلاینت tree-shake می‌کند (#15875). به زبان ساده، اپ‌هایی که hydrate نمی‌کنند نباید این کد را حمل کنند. changelog عددی برای اندازه نمی‌دهد و اندازه‌گیری هم ندارم؛ پیش از فرض سود، باندل خودتان را با یک visualizer قبل و بعد بسنجید.

## برای یک پروژه واقعی چه معنایی دارد

- **production روی 3.5.x:** چیزی تغییر نمی‌کند. روی شاخه پایدار بمانید.
- **آزمودن Vapor در اپ ترکیبی:** اگر تغییر route یا تب را انیمیت می‌کنید، rc.12 را روی یک branch نصب کنید. هر `Transition` که دور `KeepAlive`، محتوای اسلات با `v-if` یا `TransitionGroup` است را دوباره تست کنید.
- **نویسندگان کتابخانه:** موارد interop (#15866 و #15850) روی کامپوننت‌هایی اثر می‌گذارند که برای هر دو رندرر عرضه می‌شوند. تست‌های بصری یا E2E را روی vdom و Vapor اجرا کنید.
- **کاربران Nuxt:** بررسی نکردم Nuxt فعلی با پیش‌انتشارهای 3.6 چگونه رفتار می‌کند، پس این پست را اظهارنظر درباره سازگاری Nuxt نگیرید.

## مصالحه‌ها

هر rc در این سری باگ‌هایی را می‌بندد که در آن‌ها مدل Vapor (به‌روزرسانی مستقیم DOM بدون درخت مجازی برای diff) باید تضمین‌ها را دستی بازسازی کند. ترتیب انیمیشن سخت‌ترین آن‌هاست چون به زمان درج، نگه‌داری و حذف node‌ها بستگی دارد. نسخه‌ای که بیشتر از چنین اصلاحاتی ساخته شده نشانه خوبی از همگرایی است و هم شاهدی که سطح کار هنوز جا نیفتاده. برچسب پیش‌انتشار درست است: RC بعدی ممکن است باز همین کد را لمس کند.

## منابع

- [vuejs/core releases](https://github.com/vuejs/core/releases)
- [vuejs/core CHANGELOG (minor branch)](https://raw.githubusercontent.com/vuejs/core/minor/CHANGELOG.md)
